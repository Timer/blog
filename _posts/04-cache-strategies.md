---
slug: 'cache-strategies'
title: 'Cache strategies, explained'
date: '2026-01-29T12:00:00.000Z'
---

Where does the write go? To the cache, to the backing store, or both?

This question defines your caching strategy. Get it wrong and you lose data or tank performance. Get it right and you unlock the same trick that makes [LSM trees](/posts/btrees-vs-lsm) and NVMe drives fast.

### Write-through

Every write goes to both the cache and the backing store. The write isn't acknowledged until both complete.

```
App → Cache → Backing Store
         ↓
      (wait for both)
```

Simple and safe. If the cache disappears, your data is already persisted. The downside: you're bottlenecked by the slower backing store on every write.

### Write-back

Writes go to the cache only. The backing store gets updated later, asynchronously.

```
App → Cache → (ack immediately)
         ↓
      (flush later)
         ↓
   Backing Store
```

Your writes are fast because you're only hitting the cache. The backing store gets batched updates when convenient.

The risk: if the cache dies before flushing, you lose data. For important data, you need replication or a write-ahead log to recover.

This is how LSM trees work. The memtable is the cache. Disk is the backing store. Writes hit memory, get acknowledged, and flush later as SSTables.

### Write-around

Writes bypass the cache entirely and go straight to the backing store. The cache only gets populated on reads.

```
App → Backing Store (writes)
App → Cache → Backing Store (reads, on miss)
```

Useful when you're writing data you don't expect to read soon. Avoids polluting the cache with write-once data.

### Read-through (pull-through)

On a cache miss, the cache fetches from the backing store, stores it, then returns it. The application doesn't talk to the backing store directly.

```
App → Cache (miss) → Backing Store
         ↓
   (cache stores it)
         ↓
   (return to app)
```

The cache is transparent. Your app just asks for data; the cache handles the rest.

### Cache-aside

The application manages everything. On a miss, the app fetches from the backing store and populates the cache itself.

```
App → Cache (miss)
App → Backing Store (app fetches directly)
App → Cache (app stores it)
```

More control, more code. You decide what gets cached and when.

### The trade-off matrix

| Strategy      | Write latency | Read latency | Durability        | Complexity |
| ------------- | ------------- | ------------ | ----------------- | ---------- |
| Write-through | Slow          | Fast (hit)   | High              | Low        |
| Write-back    | Fast          | Fast (hit)   | Needs replication | Medium     |
| Write-around  | Slow          | Fast (hit)   | High              | Low        |
| Read-through  | N/A           | Fast (hit)   | N/A               | Low        |
| Cache-aside   | N/A           | Fast (hit)   | N/A               | High       |

### Where you see this

Write-back shows up everywhere performance matters:

| System               | Cache layer    | Backing store   | Durability strategy       |
| -------------------- | -------------- | --------------- | ------------------------- |
| LSM trees            | Memtable (RAM) | SSTables (disk) | WAL (write-ahead log)     |
| NVMe SSDs            | DRAM cache     | NAND flash      | Flush on fsync            |
| CPU                  | L1/L2/L3 cache | RAM             | None (volatile anyway)    |
| Linux page cache     | RAM            | Disk            | fsync, O_DIRECT to bypass |
| Database buffer pool | RAM            | Disk            | WAL, checkpoints          |

The pattern is the same: absorb writes in fast storage, flush to slow storage in batches.

### The NVMe parallel

NVMe drives have a DRAM write-back cache in front of the NAND flash. When you write, data lands in DRAM first. The drive reports success immediately, then flushes to flash in the background.

This is why databases use fsync to force data to stable storage. Without it, a power loss can lose recent writes that the drive already acknowledged.

Same trade-off as LSM trees: write-back gives you speed, but you need a strategy for failures.

### The combo: write-back + read-through

To make a disk fast, you want both:

1. Write-back for writes: data lands in cache, gets acknowledged immediately, syncs to backing store lazily
2. Read-through for reads: reads hit the cache first, which has the freshest data (including unflushed writes)

The cache becomes the source of truth for recent data. Reads never see stale data because they check the cache first, which contains writes that haven't hit disk yet. The backing store is just a durability layer that catches up asynchronously.

```
Write: App → Cache (ack) .......... (lazy sync) → Backing Store
Read:  App → Cache (has fresh data, including unflushed writes)
              ↓ (miss)
          Backing Store
```

This is how LSM trees work: reads check the memtable first (the write-back cache), then fall through to SSTables on disk. The memtable always has the freshest view. Compaction syncs everything to disk in the background.

Same pattern in a database buffer pool, CPU cache, or NVMe drive. The fast layer absorbs writes and serves reads. The slow layer provides durability.

### When to use what

- **Write-through**: durability matters more than speed, or you can't trust your cache
- **Write-back**: you need write performance and have a replication or WAL strategy
- **Write-around**: you're writing data that won't be read soon (bulk loads, cold data)
- **Read-through/cache-aside**: orthogonal to write strategy; depends on whether you want the cache to be transparent

### So what

Write-back is the key to making writes fast. But it's a bet: your cache won't die before flushing. LSM trees, NVMe drives, and CPU caches all make that bet. The difference is how they handle losing it.
