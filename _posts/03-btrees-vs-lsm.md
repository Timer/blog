---
slug: 'btrees-vs-lsm'
title: 'The Evolution of Storage: From Hash Tables to LSM Trees'
date: '2026-01-28T12:00:00.000Z'
---

Have you ever encouraged procrastination? _Yeah, you can do that later..._

What about in computing? Every data structure has to decide when to pay the "bookkeeping" cost. Do you organize as you go, or defer it and batch the work later?

This question has driven decades of innovation in how we store and retrieve data. Let's trace that evolution.

### Hash tables: The baseline

Hash tables give you O(1) lookups. You hash a key, go directly to that slot, done. Hard to beat.

But they have limitations:

- **No ordering**: you can't ask "give me all keys between A and M"
- **No range queries**: scanning requires touching every slot
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

Your data is always organized. Lookups are predictable. But you're paying the bookkeeping cost on every operation, and that cost is **random I/O**.<sub style="font-size:0.7em"><a href="#ref-1">[1]</a></sub>

### The log-structured insight

In 1991, Rosenblum and Ousterhout asked a different question: what if we never modified data in place?<sub style="font-size:0.7em"><a href="#ref-2">[2]</a></sub>

Their Log-structured File System (LFS) treated the entire disk as an append-only log. Writes always go to the end. Old data gets garbage collected later.

This sounds wasteful, but it converts random writes into sequential writes. Sequential I/O is 10-100x faster on spinning disks, still 5-20x faster on SSDs.<sub style="font-size:0.7em"><a href="#ref-3">[3]</a></sub>

The same insight shows up in filesystems:

| Filesystem | Write strategy      | Philosophy                                |
| ---------- | ------------------- | ----------------------------------------- |
| ext4, XFS  | In-place + journal  | Established: fix it now                   |
| btrfs, ZFS | Copy-on-write       | Next-gen: never overwrite, clean up later |
| bcachefs   | Copy-on-write + LSM | Next-gen: both techniques combined        |

Copy-on-write filesystems are basically applying log-structured patterns to the filesystem layer.

### LSM trees: Log-structured meets sorted

LSM trees (Log-Structured Merge trees) took the append-only insight and applied it to sorted indexes.<sub style="font-size:0.7em"><a href="#ref-4">[4]</a></sub> This is what powers RocksDB, LevelDB, Cassandra, and ScyllaDB.

The design:

1. Writes go to memory first, in a sorted buffer called a **memtable**
2. When it fills up, flush to disk as a sorted file called an **SSTable**
3. Periodically merge SSTables in the background (**compaction**)

Instead of organizing on every write, you batch it up and do it asynchronously. The bookkeeping still happens, just later, in bulk, when sequential I/O makes it cheap.

### Don't you end up doing the same work?

No. Way less.

By batching hundreds of writes into a single sequential flush, you're amortizing the I/O cost across all of them. One disk seek instead of hundreds.

### But reads must be slower?

In theory, yes. You might check multiple SSTables to find your data.

In practice:

- **Bloom filters** on each SSTable tell you which files definitely don't have your key
- Recent data is usually still in the memtable (in memory)
- Hot data gets cached at multiple levels

For many workloads, read performance is comparable to B-trees. For write-heavy workloads, LSM trees dominate.

### Temporal vs spatial locality

Here's where it gets interesting.

**Spatial locality** assumes data near each other in address space should be stored together. B-trees optimize for this: record #1000 is stored near record #1001.

**Temporal locality** assumes data written at the same time should be stored together. LSM trees optimize for this: everything flushed in the same batch ends up in the same SSTable.

Why does temporal locality matter? Because it matches how systems actually behave:

| Scenario           | Why temporal locality helps                                 |
| ------------------ | ----------------------------------------------------------- |
| `npm install`      | Thousands of files written in a burst; they belong together |
| App startup        | Reads config and state that was all persisted together      |
| Checkpoint restore | Reading a consistent snapshot                               |
| Transactions       | Records committed together are accessed together            |

Data you need right now was usually written together at some point. Grouping by write-time often matches access patterns better than grouping by key.

### The trade-offs (there's always trade-offs)

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

<span id="ref-4">[4]</span> O'Neil et al. "The Log-Structured Merge-Tree". Acta Informatica, 1996.

<span id="ref-5">[5]</span> Zhang et al. ["What's the Story in EBS Glory: Evolutions and Lessons in Building Cloud Block Store"](https://www.usenix.org/conference/fast24/presentation/zhang-weidong). USENIX FAST, 2024.

</small>
