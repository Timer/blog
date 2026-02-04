---
slug: 'cap-theorem'
title: 'The first rule of systems engineering'
date: '2026-02-03T12:00:00.000Z'
---

You can't have your cake and eat it too. Not even if you say please. <img src="/heheheheheh.gif" alt="heheheheheh" style="display:inline;height:1em;vertical-align:middle;" />

Every distributed system is a choice between what you want and what you can actually have. The CAP theorem is the most famous way to say this, and also the most misunderstood.

### The theorem

Eric Brewer proposed it in 2000, and Gilbert & Lynch proved it in 2002.<sub style="font-size:0.7em"><a href="#ref-1">[1]</a></sub> It says: a distributed system can provide at most two of three guarantees:

- **Consistency**: every read sees the most recent write
- **Availability**: every request gets a response (no timeouts, no errors)
- **Partition tolerance**: the system keeps working when network messages get dropped

Pick two. You can't have all three.

### Why not all three?

Imagine two database nodes, A and B. A client writes to A. Before A can replicate to B, the network between them fails. Now a different client reads from B.

What do you do?

- **Return stale data** (sacrifice consistency): B responds with old data. The system stayed available.
- **Block or error** (sacrifice availability): B refuses to respond until it can check with A. The system stayed consistent.
- **Don't distribute** (sacrifice partition tolerance): run on a single node. No network between nodes means no partition. A single PostgreSQL instance is consistent and available, until the machine dies or becomes unreachable. Then you have nothing.

That's the trade-off. CA systems exist, but they're not distributed in the fault-tolerant sense. The moment you add a second node to survive failures, you've introduced a network, and networks partition. Then you're choosing between C and A.

### The misconception

People read CAP and think they're choosing a permanent category: "We're a CP system" or "We're an AP system."

That's not (quite) how it works.

The choice only matters during a partition (when something goes wrong). Most of the time, the network is fine, and you can have all three. CAP is about what you give up when things go wrong.

| State               | What you get          |
| ------------------- | --------------------- |
| Network healthy     | C + A + P (all three) |
| Network partitioned | Pick C or A           |

A system might be consistent 99.9% of the time and only go available-but-stale during the 0.1% when partitions happen. Or vice versa. It's a policy for failure modes, and has implications for the rest of your system.

### Where you see this

**CP systems** (consistent, partition-tolerant):

| System    | What happens during partition                         |
| --------- | ----------------------------------------------------- |
| etcd      | Minority partition can't reach quorum; rejects writes |
| ZooKeeper | Minority can't reach leader; rejects writes           |
| MongoDB   | With majority write concern, blocks until quorum acks |

These systems prioritize consistency. They'll reject writes they can't guarantee.

**AP systems** (available, partition-tolerant):

| System    | What happens during partition                   |
| --------- | ----------------------------------------------- |
| DynamoDB  | Eventually consistent reads by default          |
| Cassandra | Nodes serve local data; conflicts resolve later |
| DNS       | Caches serve stale records until TTL expires    |

These systems keep responding, even if the data might be out of date.

### Consistency has levels

Between "every read sees the latest write" and "anything goes," there's a range. Weaker models can still provide useful guarantees:

- **Read-your-writes**: you see your own writes, others might not yet. You post a comment, refresh, your comment is there.
- **Monotonic reads**: your view of time doesn't go backwards. You see a video has 50k views, refresh, it won't show 48k. Someone else might still see 48k.
- **Causal consistency**: causes precede effects, globally. If Joe asks "Lunch?" and Emily replies "I'm in", no one sees Emily's reply without Joe's question.

These are weaker than strong consistency but stronger than "anything goes." And some applications can design with them in mind.

### The first rule

Systems can't be perfect, they will fail. CAP helps you understand the trade-offs. Every system you build on has made them. Understanding them tells you where it will fail. Every system you build will make them too.

That's the first rule. You can't have it all. 🎂

<small>

<span id="ref-1">[1]</span> Gilbert & Lynch. ["Brewer's Conjecture and the Feasibility of Consistent, Available, Partition-Tolerant Web Services"](https://users.ece.cmu.edu/~adrian/731-sp04/readings/GL-cap.pdf). ACM SIGACT News, 2002.

</small>
