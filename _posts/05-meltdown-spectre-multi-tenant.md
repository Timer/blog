---
slug: 'untrusted-code'
title: 'Running untrusted code in the age of agents'
date: '2026-02-02T12:00:00.000Z'
lastEdited: '2026-11-09'
---

Code used to be scarce. Humans wrote it, reviewed it, deployed it. You knew where it came from.

AI changes that. Agents generate code, pull from repos, execute user input. Code is abundant now, and most of it is untrusted. If you're building infrastructure for this world, you need isolation at every layer.

### MicroVMs aren't enough

Firecracker and similar microVM technologies provide strong isolation. Each execution gets its own kernel, filesystem, and network. A guest escape has to break through KVM virtualization, then past Firecracker's seccomp filters and the jailer's cgroups and namespaces. That's a lot of layers.<sub style="font-size:0.7em"><a href="#ref-1">[1]</a></sub>

But security research has found gaps. Firecracker relies on host kernel mitigations for speculative execution attacks. It doesn't add protection against cross-hyperthread attacks like L1 Terminal Fault or Microarchitectural Data Sampling.<sub style="font-size:0.7em"><a href="#ref-2">[2]</a></sub>

These attacks exploit shared CPU resources. Sibling hyperthreads share the L1 data cache and internal CPU buffers. A malicious VM on one hyperthread can sample data from whatever's running on the other, even across VM boundaries.<sub style="font-size:0.7em"><a href="#ref-3">[3]</a></sub><sub style="font-size:0.7em"><a href="#ref-4">[4]</a></sub>

The kernel documentation is direct: for full protection, disable hyperthreading.<sub style="font-size:0.7em"><a href="#ref-3">[3]</a></sub> Firecracker's own production guide recommends the same.<sub style="font-size:0.7em"><a href="#ref-5">[5]</a></sub> That cuts your vCPU count in half. Throughput drops by less, since a hyperthread isn't a full core, but it's still capacity you're giving up.

### Core scheduling

The kernel community built a middle ground. Core scheduling landed in Linux 5.14.<sub style="font-size:0.7em"><a href="#ref-6">[6]</a></sub>

You tag processes with trust boundaries. The scheduler ensures only processes with the same tag can run on sibling hyperthreads simultaneously. Different tags? One idles.

It works through cookies assigned via prctl(). Cookies inherit across fork and exec, so you can tag an entire VM's process tree. The kernel prevents VMs with different cookies from sharing a physical core.<sub style="font-size:0.7em"><a href="#ref-7">[7]</a></sub>

Early benchmarks showed virtualization workloads running at 96% throughput with core scheduling enabled, versus 87% with hyperthreading disabled.<sub style="font-size:0.7em"><a href="#ref-8">[8]</a></sub> You keep your full vCPU count for a small overhead.

### System cores, guest cores

Core scheduling decides which tasks may share a core. The host kernel isn't a task. An interrupt or a kernel thread can still run on one hyperthread while a guest runs on its sibling, and core scheduling doesn't stop that.<sub style="font-size:0.7em"><a href="#ref-7">[7]</a></sub>

So don't let them share. Split the machine's CPUs into two sets:

- **System**: interrupts, kernel threads, host daemons, and everything else the host does for itself.
- **Guest**: vCPUs, and nothing else.

The kernel's own guidance is exclusive cpusets, "to ensure that no other guest or host tasks can run on these cores", plus moving interrupts away from the CPUs that run untrusted guests.<sub style="font-size:0.7em"><a href="#ref-4">[4]</a></sub> With that, almost all the host work left beside a guest is work that guest caused.

Not quite all. A few interrupts can't be moved (the local timer is one), and it costs you the system cores. AWS takes the same idea to its end: EC2 pins cores to an instance, and they are "never simultaneously shared among customers".<sub style="font-size:0.7em"><a href="#ref-9">[9]</a></sub>

MicroVMs, core scheduling, and a guest CPU set give you three layers: VM isolation for the software boundary, core scheduling between guests, and CPU sets between guests and the host. Defense in depth.

### The ARM path

There's another approach: use hardware that doesn't have the problem.

AWS Graviton, Ampere Altra, and most ARM server chips don't implement hyperthreading. One vCPU equals one physical core. No sibling threads to leak across.<sub style="font-size:0.7em"><a href="#ref-10">[10]</a></sub>

ARM cores aren't immune to speculative execution attacks in general (Spectre affects them too), but the cross-hyperthread class is gone.

ARM's simpler instruction set is more power efficient, so vendors pack more physical cores into the same power envelope. Ampere Altra Max ships 128 cores. You get the thread count without the security trade-off.

No hyperthreads also means predictable performance. Two VMs can't contend for the same execution units. When you're running thousands of isolated executions and billing for CPU time, predictability matters.

### Why not just use ARM?

Compatibility. x86 binaries don't run on ARM. Some workloads need AVX-512 or VNNI for ML acceleration. Legacy software may not have ARM builds. And x86 has stronger memory ordering guarantees, so concurrent code that works on x86 can have subtle race conditions on ARM.<sub style="font-size:0.7em"><a href="#ref-11">[11]</a></sub>

For portable code, ARM works. For arbitrary user code that might depend on x86, you need x86.

### Why x86 still ships hyperthreading

x86 cores use more power, so hyperthreading is how Intel and AMD get more threads without blowing the power budget. AMD claims 30-50% throughput gains for less than 5% of the core's area.<sub style="font-size:0.7em"><a href="#ref-12">[12]</a></sub>

It's not universal, though. AWS's AMD-based M7a instances run with hyperthreading off, so each vCPU is a physical core.<sub style="font-size:0.7em"><a href="#ref-13">[13]</a></sub> Intel's E-core Xeons don't have it at all.

If you can layer the right mitigations, x86 with hyperthreading is still viable for untrusted workloads.

### Choosing your approach

| Approach                        | Cross-thread leakage | vCPU count               | Complexity |
| ------------------------------- | -------------------- | ------------------------ | ---------- |
| Disable hyperthreading          | Eliminated           | 50% fewer                | Low        |
| Core scheduling + guest CPU set | Mitigated            | Same, minus system cores | Medium     |
| ARM (no hyperthreading)         | Not applicable       | N/A                      | Low        |

For x86, the combination of Firecracker-style isolation, core scheduling, and a guest CPU set makes untrusted multi-tenant compute practical. For ARM, the cross-hyperthread problem doesn't exist in the first place.

In a world where AI generates more code than humans review, running untrusted code efficiently isn't optional. The isolation primitives exist. The question is whether your stack uses them.

<small>

<span id="ref-1">[1]</span> AWS. ["Firecracker - Lightweight Virtualization for Serverless Computing"](https://aws.amazon.com/blogs/aws/firecracker-lightweight-virtualization-for-serverless-computing/). 2018.

<span id="ref-2">[2]</span> Weissman et al. ["Microarchitectural Security of AWS Firecracker VMM for Serverless Cloud Platforms"](https://arxiv.org/abs/2311.15999). 2023.

<span id="ref-3">[3]</span> Linux Kernel. ["MDS - Microarchitectural Data Sampling"](https://docs.kernel.org/admin-guide/hw-vuln/mds.html).

<span id="ref-4">[4]</span> Linux Kernel. ["L1TF - L1 Terminal Fault"](https://docs.kernel.org/admin-guide/hw-vuln/l1tf.html).

<span id="ref-5">[5]</span> Firecracker. ["Production Host Setup Recommendations"](https://github.com/firecracker-microvm/firecracker/blob/main/docs/prod-host-setup.md).

<span id="ref-6">[6]</span> Corbet. ["Core scheduling lands in 5.14"](https://lwn.net/Articles/861251/). LWN, 2021.

<span id="ref-7">[7]</span> Linux Kernel. ["Core Scheduling"](https://docs.kernel.org/admin-guide/hw-vuln/core-scheduling.html).

<span id="ref-8">[8]</span> Corbet. ["Completing and merging core scheduling"](https://lwn.net/Articles/820321/). LWN, 2020.

<span id="ref-9">[9]</span> AWS. ["The EC2 approach to preventing side-channels"](https://docs.aws.amazon.com/whitepapers/latest/security-design-of-aws-nitro-system/the-ec2-approach-to-preventing-side-channels.html). The Security Design of the AWS Nitro System.

<span id="ref-10">[10]</span> Ampere Computing. ["Looking Beyond SMT in the Cloud"](https://amperecomputing.com/en/blogs/looking-beyond-smt-in-the-cloud).

<span id="ref-11">[11]</span> ARM. ["Learn about the C++ memory model for porting applications to Arm"](https://learn.arm.com/learning-paths/servers-and-cloud-computing/arm-cpp-memory-model/1/).

<span id="ref-12">[12]</span> AMD. ["Simultaneous Multithreading: Driving Performance and Efficiency on AMD EPYC CPUs"](https://www.amd.com/en/blogs/2025/simultaneous-multithreading-driving-performance-a.html). 2025.

<span id="ref-13">[13]</span> AWS. ["Amazon EC2 M7a Instances"](https://aws.amazon.com/ec2/instance-types/m7a/).

</small>
