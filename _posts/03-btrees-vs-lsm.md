---
slug: 'btrees-vs-lsm'
title: 'The art of procrastination, in storage'
date: '2026-01-28T12:00:00.000Z'
lastEdited: '2026-11-09'
---

When do you organize your data? Every write, or... later?

Hash tables and B-trees said: every write. LSM trees said: later. Turns out, procrastinating is sometimes the right call.

### Hash tables: The baseline

Hash tables give you O(1) lookups. You hash a key, go directly to that slot, done. Hard to beat.

But they have limitations:

- **No ordering**: you can't ask "give me all keys between A and M" without touching every slot
- **Resizing is expensive**: when the table fills up, you rehash everything

For pure key-value lookups (memcached, Redis), hash tables are great. But databases need more.

### B-trees: The workhorse

B-trees solved the ordering problem. They keep keys sorted in a tree structure, giving you:

- O(log n) lookups
- Efficient range scans (just walk the leaves)
- Good cache/disk utilization (nodes sized to pages)

This is the backbone of most relational databases: PostgreSQL, MySQL InnoDB, SQLite. On every write, you:

1. Traverse the tree to find the right page
2. Read that page from disk
3. Modify it in place
4. Write it back
5. Maybe rebalance, triggering more writes

Real engines soften this by buffering dirty pages in memory behind a write-ahead log (a [write-back cache](/post/cache-strategies)). But every dirty page still has to be written back to its own spot on disk eventually.

Your data is always organized. Lookups are predictable. But you're paying the bookkeeping cost on every operation, and that cost is random I/O.<sub style="font-size:0.7em"><a href="#ref-1">[1]</a></sub>

### The log-structured insight

In 1991, Rosenblum and Ousterhout asked a different question: what if we never modified data in place?<sub style="font-size:0.7em"><a href="#ref-2">[2]</a></sub>

Their Log-structured File System (LFS) treated the entire disk as an append-only log. Writes always go to the end. Old data gets garbage collected later.

This sounds wasteful, but it converts random writes into sequential writes. Sequential access can be orders of magnitude faster than random access on spinning disks, and it's still much faster on SSDs.<sub style="font-size:0.7em"><a href="#ref-3">[3]</a></sub>

The same insight lives on in modern filesystems:

| Filesystem | Write strategy                       | Philosophy                                |
| ---------- | ------------------------------------ | ----------------------------------------- |
| ext4, XFS  | In-place + journal                   | Established: fix it now                   |
| btrfs, ZFS | Copy-on-write                        | Next-gen: never overwrite, clean up later |
| bcachefs   | Copy-on-write + log-structured nodes | Next-gen: both techniques combined        |

Copy-on-write filesystems are basically carrying that log-structured idea forward.

### LSM trees: Log-structured meets sorted

LSM trees (Log-Structured Merge trees) took the append-only insight and applied it to sorted indexes.<sub style="font-size:0.7em"><a href="#ref-4">[4]</a></sub> This is what powers RocksDB, LevelDB, Cassandra, and ScyllaDB.

The design:

1. Writes go to memory first, in a sorted buffer called a memtable (plus a quick sequential append to a write-ahead log, so a crash doesn't lose them)
2. When it fills up, flush to disk as a sorted file called an SSTable
3. Periodically merge SSTables in the background (compaction)

Instead of organizing on every write, you batch it up and do it asynchronously. The bookkeeping still happens, just later, in bulk, when sequential I/O makes it cheap.

### Don't you end up doing the same work?

No. Cheaper work.

By batching hundreds of writes into a single sequential flush, you're amortizing the I/O cost across all of them. One disk seek instead of hundreds. You actually write more bytes in total (more on that below), but sequential bytes are cheap.

### But reads must be slower?

In theory, yes. You might check multiple SSTables to find your data.

In practice:

- **Bloom filters** on each SSTable tell you which files definitely don't have your key
- Recent data is usually still in the memtable (in memory)
- Hot data gets cached at multiple levels

For many workloads, read performance is comparable to B-trees. For write-heavy workloads, LSM trees dominate.

### Temporal vs spatial locality

Here's where it gets interesting.

Spatial locality (the LFS paper calls it logical locality) assumes data near each other in key space should be stored together. B-trees optimize for this: record #1000 is stored near record #1001.

Temporal locality assumes data written at the same time should be stored together. Log-structured storage optimizes for this: everything flushed in the same batch ends up together on disk. In an LSM tree, that's a freshly flushed SSTable.

Why does temporal locality matter? Because it matches how systems actually behave:

| Scenario           | Why temporal locality helps                                 |
| ------------------ | ----------------------------------------------------------- |
| `npm install`      | Thousands of files written in a burst; they belong together |
| App startup        | Reads config and state that were all persisted together     |
| Checkpoint restore | Snapshots are written in one burst and read back whole      |
| Transactions       | Records committed together are accessed together            |

Data you need right now was usually written together at some point. Grouping by write-time often matches access patterns better than grouping by key.

LSM trees only hold onto this for a while: compaction gradually re-sorts older data by key. But the newest data, usually the hottest, stays grouped by write-time.

### The trade-offs (there are always trade-offs)

LSM trees optimize for writes at some cost:

- **Write amplification**: data gets rewritten multiple times during compaction
- **Space amplification**: you temporarily store redundant data
- **Read amplification**: worst-case reads check multiple levels

For write-heavy workloads (logging, time-series, event streams), the trade-off is worth it. For read-heavy OLTP with lots of point queries, B-trees still make sense.

### So what?

Back to our opening question: when do you pay the bookkeeping cost? B-trees say now, on every write. LSM trees say later, in bulk, when sequential I/O makes it cheap.

That's the trick. Procrastination, done right, can be an advantage.

We're seeing this pattern show up in unexpected places. Cloud block storage systems are adopting log-structured designs to handle virtualized storage at scale.<sub style="font-size:0.7em"><a href="#ref-5">[5]</a></sub> And with AI training flushing massive checkpoints every few minutes, the demand for write-optimized storage is only growing. This might be the architecture for the next generation of storage infrastructure.

And that's my love letter to the LSM tree. It's not real magic, but it's damn close.

<small>

<span id="ref-1">[1]</span> Graefe. ["Modern B-Tree Techniques"](https://doi.org/10.1561/1900000028). Foundations and Trends in Databases, 2011.

<span id="ref-2">[2]</span> Rosenblum & Ousterhout. ["The Design and Implementation of a Log-Structured File System"](https://people.eecs.berkeley.edu/~brewer/cs262/LFS.pdf). SOSP, 1991.

<span id="ref-3">[3]</span> Jacobs. ["The Pathologies of Big Data"](https://queue.acm.org/detail.cfm?id=1563874). ACM Queue, 2009.

<span id="ref-4">[4]</span> O'Neil et al. ["The Log-Structured Merge-Tree"](https://www.cs.umb.edu/~poneil/lsmtree.pdf). Acta Informatica, 1996.

<span id="ref-5">[5]</span> Zhang et al. ["What's the Story in EBS Glory: Evolutions and Lessons in Building Cloud Block Store"](https://www.usenix.org/conference/fast24/presentation/zhang-weidong). USENIX FAST, 2024.

</small>
