---
slug: 'untrusted-code'
title: 'Running untrusted code in the age of agents'
date: '2026-02-02T12:00:00.000Z'
---

Code used to be scarce. Humans wrote it, reviewed it, deployed it. You knew where it came from.

AI changes that. Agents generate code, pull from repos, execute user input. Code is abundant now, and most of it is untrusted. If you're building infrastructure for this world, you need isolation at every layer.

### MicroVMs aren't enough

Firecracker and similar microVM technologies provide strong isolation. Each execution gets its own kernel, filesystem, and network. A guest escape has to break through KVM virtualization, then past the jailer's seccomp filters, cgroups, and namespaces. That's a lot of layers.<sub style="font-size:0.7em"><a href="#ref-1">[1]</a></sub>

But security research has found gaps. Firecracker relies on host kernel mitigations for speculative execution attacks. It doesn't add protection against cross-hyperthread attacks like L1 Terminal Fault or Microarchitectural Data Sampling.<sub style="font-size:0.7em"><a href="#ref-2">[2]</a></sub>

These attacks exploit shared CPU resources. Sibling hyperthreads share the L1 data cache. A malicious VM on one hyperthread can sample data from whatever's running on the other, even across VM boundaries.<sub style="font-size:0.7em"><a href="#ref-3">[3]</a></sub><sub style="font-size:0.7em"><a href="#ref-4">[4]</a></sub>

The kernel documentation is direct: for full protection, disable hyperthreading.<sub style="font-size:0.7em"><a href="#ref-3">[3]</a></sub> That cuts your vCPU count in half.

### Core scheduling

The kernel community built a middle ground. Core scheduling landed in Linux 5.14.<sub style="font-size:0.7em"><a href="#ref-5">[5]</a></sub>

You tag processes with trust boundaries. The scheduler ensures only processes with the same tag can run on sibling hyperthreads simultaneously. Different tags? One idles.

It works through cookies assigned via prctl(). Cookies inherit across fork and exec, so you can tag an entire VM's process tree. The kernel prevents VMs with different cookies from sharing a physical core.<sub style="font-size:0.7em"><a href="#ref-6">[6]</a></sub>

Benchmarks showed virtualization workloads running at 96% throughput with core scheduling enabled.<sub style="font-size:0.7em"><a href="#ref-5">[5]</a></sub> You keep your full vCPU count for a small overhead.

Firecracker plus core scheduling gives you both layers: VM isolation for the software boundary, core scheduling for the hardware boundary. Defense in depth.

### The ARM path

There's another approach: use hardware that doesn't have the problem.

AWS Graviton, Ampere Altra, and most ARM server chips don't implement hyperthreading. One vCPU equals one physical core. No sibling threads, no shared cache to leak across.<sub style="font-size:0.7em"><a href="#ref-7">[7]</a></sub>

ARM's simpler instruction set is more power efficient, so vendors pack more physical cores into the same power envelope. Ampere Altra ships 128 cores. You get the thread count without the security trade-off.

No hyperthreads also means predictable performance. Two VMs can't contend for the same execution units. When you're running thousands of isolated executions and billing for CPU time, predictability matters.

### Why not just use ARM?

Compatibility. x86 binaries don't run on ARM. Some workloads need AVX-512 or VNNI for ML acceleration. Legacy software may not have ARM builds. And x86 has stronger memory ordering guarantees, so concurrent code that works on x86 can have subtle race conditions on ARM.<sub style="font-size:0.7em"><a href="#ref-9">[9]</a></sub>

For portable code, ARM works. For arbitrary user code that might depend on x86, you need x86.

### Why x86 still ships hyperthreading

x86 cores use more power, so hyperthreading is how Intel and AMD get more threads without blowing the power budget. AMD claims 30-50% throughput gains for less than 5% additional die area.<sub style="font-size:0.7em"><a href="#ref-8">[8]</a></sub>

If you can layer the right mitigations, x86 with hyperthreading is still viable for untrusted workloads.

### Choosing your approach

| Approach                  | Security | vCPU count | Complexity |
| ------------------------- | -------- | ---------- | ---------- |
| Disable hyperthreading    | Full     | 50% fewer  | Low        |
| MicroVM + core scheduling | Strong   | Same       | Medium     |
| ARM (no hyperthreading)   | Full     | N/A        | Low        |

For x86, the combination of Firecracker-style isolation and core scheduling makes untrusted multi-tenant compute practical. For ARM, the problem doesn't exist in the first place.

In a world where AI generates more code than humans review, running untrusted code efficiently isn't optional. The isolation primitives exist. The question is whether your stack uses them.

<small>

<span id="ref-1">[1]</span> AWS. ["Firecracker - Lightweight Virtualization for Serverless Computing"](https://aws.amazon.com/blogs/aws/firecracker-lightweight-virtualization-for-serverless-computing/). 2018.

<span id="ref-2">[2]</span> Schlüter et al. ["Microarchitectural Security of AWS Firecracker VMM"](https://arxiv.org/abs/2311.15999). 2024.

<span id="ref-3">[3]</span> Linux Kernel. ["MDS - Microarchitectural Data Sampling"](https://docs.kernel.org/admin-guide/hw-vuln/mds.html).

<span id="ref-4">[4]</span> Linux Kernel. ["L1TF - L1 Terminal Fault"](https://docs.kernel.org/admin-guide/hw-vuln/l1tf.html).

<span id="ref-5">[5]</span> Corbet. ["Completing and merging core scheduling"](https://lwn.net/Articles/820321/). LWN, 2020.

<span id="ref-6">[6]</span> Linux Kernel. ["Core Scheduling"](https://docs.kernel.org/admin-guide/hw-vuln/core-scheduling.html).

<span id="ref-7">[7]</span> Ampere Computing. ["Looking Beyond SMT in the Cloud"](https://amperecomputing.com/en/blogs/looking-beyond-smt-in-the-cloud).

<span id="ref-8">[8]</span> AMD. ["Simultaneous Multithreading: Driving Performance and Efficiency on AMD EPYC CPUs"](https://www.amd.com/en/blogs/2025/simultaneous-multithreading-driving-performance-a.html). 2025.

<span id="ref-9">[9]</span> ARM. ["Learn about the C++ memory model for porting applications to Arm"](https://learn.arm.com/learning-paths/servers-and-cloud-computing/arm-cpp-memory-model/1/).

</small>
