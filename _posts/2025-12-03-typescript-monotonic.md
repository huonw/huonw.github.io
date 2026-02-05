---
layout: default
title: "TypeScript strictness is non-monotonic: strict-null-checks and no-implicit-any interact"

description: >-
    A curiosity about the interaction between two TypeScript compiler settings, that lead to errors that appear and disappear, as one increases strictness.

style: |


hashtags: []
comments:
---

The TypeScript compiler options `strictNullChecks` and `noImplicitAny` interact in a strange way: enabling just `strictNullChecks` leads to type errors that disappear after enabling `noImplicitAny` too, meaning getting stricter has fewer errors!

This is a low-consequence curiosity, but I did trip over it in the real world, while updating some modules at work to be stricter.

## The context

TypeScript is a powerful tool for taming a JavaScript codebase, but getting the most assurance requires using it in "strict" mode.

Adopting TypeScript in an existing JavaScript codebase can be done incrementally by turning on each of the strict sub-settings, and working through the errors, one-by-one. The incremental approach makes the adoption feasible: don't fix the _whole world_ in one big bang, make several smaller changes until, finally, the world is fixed.

At work, we've recently been ratcheting up our strictness incrementally in this manner, and I came across this interaction.

## The example

What's the type of `array` in this code snippet?

{% highlight typescript linenos %}
const array = [];
array.push(123);
{% endhighlight %}

<details markdown="1">
<summary>
As a standalone snippet, it looks weird and pointless ("why not <code>const array = [123];</code>?"), but it's the minimal version of real-world code (click for example).
</summary>

{% highlight typescript linenos %}
const featureFlags = [];

if (enableRocket()) {
  featureFlags.push("rocket");
}
if (enableParachute()) {
  featureFlags.push("parachute");
}

prepareForLandSpeedRecord(featureFlags);
{% endhighlight %}

</details>

There's no explicit annotation, so TypeScript needs to infer it. The inference is a bit fancy, because it requires "time-travel": the `const array = []` declaration doesn't say anything about what might be in the array, that only comes from the `push` later in the code.

Given all this, it's not too surprising that the exact inferred type depends on two TypeScript language options:

<div class="table-wrapper" markdown="1">

|              | `strictNullChecks`{:.break-all} | `noImplicitAny`{:.break-all} | Inferred type |
|--------------|---------------------------------|------------------------------|---------------|
| least strict | ❌                              | ❌                           | `any[]`       |
|              | ❌                              | ✅                           | `number[]`    |
|              | ✅                              | ❌                           | `never[]`     |
| most strict  | ✅                              | ✅                           | `number[]`    |

</div>

## The options

The two options that are influencing the inferred type here are:

- [`strictNullChecks`][snc]: properly enforce handling of optional/nullable values. For instance, when enabled, a nullable string variable (type `string | null`) can't be used directly where a plain `string` value is expected.
- [`noImplicitAny`][nia]: avoid inferring the "catch-all" `any` type in some ambiguous cases.

[snc]: https://www.typescriptlang.org/tsconfig/#strictNullChecks
[nia]: https://www.typescriptlang.org/tsconfig/#noImplicitAny

It's best to have them both enabled: `strictNullChecks` solves the ["billion dollar mistake"][bdm], and `noImplicitAny` reduces the number of error-prone `any`s that infect the codebase.

[bdm]: https://en.wikipedia.org/wiki/Null_pointer#History

## The problem

The third configuration in our table above, with `strictNullChecks` enabled and `noImplicitAny` disabled, infers `array: never[]`. The code snippet is thus invalid and is rejected with an error ([live example][live-example]):

[live-example]: https://www.typescriptlang.org/play/?strict=false&noImplicitAny=false&strictFunctionTypes=false&strictPropertyInitialization=false&strictBindCallApply=false&noImplicitThis=false&noImplicitReturns=false&alwaysStrict=false&esModuleInterop=false&declaration=false&noErrorTruncation=true&noImplicitOverride=false&ts=5.9.3#code/GYVwdgxgLglg9mABMAFASkQbwFCL4gegMRQDkAhAOkRiQENlxp4kAjAUwjpAGd3EGUOAAcAtABt2AN3bjEUugCcYdVpMQATTuKV1YCGj0Q9xMAOYALKOICex4ZxXi02XPggIeUAYsV07ALyIANoAugDcbnhKfjaUwrwWKACMAEwAzGiRAL5AA

{% highlight typescript linenos %}
array.push(123);
//         ^^^ error: Argument of type '123' is not assignable to parameter of type 'never'.
{% endhighlight %}

Nothing (not the `123` literal, nor any other `number`, nor anything else) is a "subtype" of `never`, and so, yes, it makes sense that this code is invalid.

## The strangeness

"Enable some stricter requirements, and get an error" is not surprising and not noteworthy... but let's look closely at the table again:

<div class="table-wrapper" markdown="1">

|              | `strictNullChecks`{:.break-all} | `noImplicitAny`{:.break-all} | Inferred type |
|--------------|---------------------------------|------------------------------|---------------|
| least strict | ❌                              | ❌                           | `any[]`       |
|              | ❌                              | ✅                           | `number[]`    |
| **error!**   | ✅                              | ❌                           | **`never[]`** |
| most strict  | ✅                              | ✅                           | `number[]`    |

</div>

So, if we're starting with a lax codebase, and looking to make it strict, we might:

1. enable `strictNullChecks`, and hit a new error (no surprise), then
2. **resolve this error** without code changes, just by enabling `noImplicitAny` (surprise!).

As we're going towards fully strict, enabling strictness options one-by-one can make some "spurious" errors appear transiently, just in the intermediate semi-strict state. The number of errors goes up and then down as we turn on settings!

I'd personally expect enabling strict options to be monotonic: more options enabled = more errors emitted. This pair of options violates that expectation.

## The solution

There's a few ways to "solve" this weirdness when trying to make a TypeScript codebase strict:

1. Just fix the errors with explicit annotations like `const array: number[] = []`.
2. Use a different one-by-one order: enable `noImplicitAny` first and then `strictNullChecks`. As the table shows, the inference gives `array: number[]` for both steps in this order, and thus there's no error.
3. Enable them together: instead of trying to be fully incremental, just enable these two options in one step.

## The explanation

Why does having `strictNullChecks` enabled and `noImplicitAny` disabled lead to an error that doesn't appear elsewhere? [jcalz explains it well on StackOverflow][explain], with the core being:

- This problematic combination is an edge-case which was left for **backwards compatibility**, where `array`'s type is inferred as `never[]` at its declaration and that's locked in for the rest of the code.
- Enabling `noImplicitAny` has the compiler use "evolving" types in ambiguous locations (places where `any` would be inferred, without `noImplicitAny`): thus, `array`'s type is _not_ confirmed on the line of its declaration and can incorporate the information from the `push` for inference.

[explain]: https://stackoverflow.com/a/72660888

## The editorialising

This feels like a cute brainteaser, rather than a major issue:

- It's not a major imposition or significant waste of time to fix the spurious errors, and arguably having the annotation may make this sort of code clearer.
- It's understandable that the semi-strict state might have weird behaviour: I imagine the TypeScript developers are more interested in a good experience with full strictness, as hopefully the intermediate states are just stepping stones, rather than a long-term situation.

## The summary

The `strictNullChecks` and `noImplicitAny` TypeScript options interact in a curious way: enabling them one-by-one in the "wrong" order leads to errors that appear and then disappear, violating the expectation of monotonicity (stricter options enabled = more errors). This can occur in real code, but has minimal impact, as it's easy to resolve and/or side-step.


{% include comments.html c=page.comments h=page.hashtags %}
