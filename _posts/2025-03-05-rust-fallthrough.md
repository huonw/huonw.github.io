---
layout: default
title: "Take a break: Rust match has fallthrough"

description: >-
  Match + labelled blocks & breaks = fallthrough. It works, but it's not very pretty!

comments:
---

Rust's `match` statement can do a lot of things, even C-style fallthough to the next branch, despite having no real support for it. It turns out to a "shallow" feature, where the C to Rust translation is easily done, without needing to understand the code itself. The hardest part is coming to terms with writing it, and then convincing someone else to let you land it!

Here's what the tail handling of the MurmurHash3 hash function could look like, in Rust, if you have enough courage[^better]:

[^better]: There may be fundamentally-better ways to approach computing this value, completely different to the C-inspired versions in this post.

{% highlight rust linenos %}
'outer: {
  'case1: {
    'case2: {
      'case3: {
        match len & 3 {
          3 => break 'case3,
          2 => break 'case2,
          1 => break 'case1,
          _ => break 'outer,
        }
      } // 'case3:
      k1 ^= (tail[2] as u32) << 16;
    } // 'case2:
    k1 ^= (tail[1] as u32) << 8;
  } // case1:
  k1 ^= tail[0] as u32;
  k1 *= c1; k1 = k1.rotate_left(15); k1 *= c2; h1 ^= k1;
}
{% endhighlight %}

This very occasionally matters and it's not too hard to inflict it upon yourself, if required. Hopefully it isn't required, because there's no way to make it pretty.

<aside data-icon="ℹ️">

This post is essentially a prose version of the 10-year-old <a href="https://github.com/pythonesque/fallthrough">pythonesque/fallthrough</a> macro. <a href="https://github.com/Jules-Bertholet/fallthrough">Jules-Bertholet/fallthrough</a> looks to be a more recent version of the same idea. I'm not associated with either, nor have I ever used them.

</aside>

## Breaking the ice

In the  MurmurHash3 hash functions, there's two interesting [snippets](https://github.com/aappleby/smhasher/blob/0ff96f7835817a27d0487325b6c16033e2992eb5/src/MurmurHash3.cpp#L205-L229) of [code](https://github.com/aappleby/smhasher/blob/0ff96f7835817a27d0487325b6c16033e2992eb5/src/MurmurHash3.cpp#L130-L136). One is for computing 128-bit results and the other for 32-bit results. They have the same vibes, but the 32-bit one is smaller and serves as a better example. It uses various `uint32_t` variables (`c1`, `c2`, `k1`, `h1`), an `int` variable `len`, and a `uint8_t *` pointer `tail`:


{% highlight c linenos %}
switch(len & 3)
{
case 3: k1 ^= tail[2] << 16;
case 2: k1 ^= tail[1] << 8;
case 1: k1 ^= tail[0];
        k1 *= c1; k1 = ROTL32(k1,15); k1 *= c2; h1 ^= k1;
};
{% endhighlight %}

It's relying on the implicit fallthrough behaviour of C's `switch` statement: if the CPU proceeds through a `case` arm without hitting a `break`, it happily continues executing the next arm. That's a compact, ["DRY"][dry] and efficient way to write this equivalent code:

[dry]: https://en.wikipedia.org/wiki/Don't_repeat_yourself

{% highlight c linenos %}
if ((len & 3) == 3) {
  // case 3:
  k1 ^= tail[2] << 16;
  // case 2:
  k1 ^= tail[1] << 8;
  // case 1:
  k1 ^= tail[0];
  k1 *= c1; k1 = ROTL32(k1,15); k1 *= c2; h1 ^= k1;
}
else if ((len & 3) == 2) {
  // case 2:
  k1 ^= tail[1] << 8;
  // case 1:
  k1 ^= tail[0];
  k1 *= c1; k1 = ROTL32(k1,15); k1 *= c2; h1 ^= k1;
}
else if ((len & 3) == 1) {
  // case 1:
  k1 ^= tail[0];
  k1 *= c1; k1 = ROTL32(k1,15); k1 *= c2; h1 ^= k1;
}
{% endhighlight %}

Expressing the original `switch` in Rust is... a bit awkward. A nice(?) version might be spelling out individual `if` statements, carefully using `>=` and avoiding `else if` to get the right fallthrough behaviour:

{% highlight rust linenos %}
if (len & 3) >= 3 {
  k1 ^= (tail[2] as u32) << 16;
}

if (len & 3) >= 2 {
  k1 ^= (tail[1] as u32) << 8;
}

if (len & 3) >= 1 {
  k1 ^= tail[0] as u32;
  k1 *= c1; k1 = k1.rotate_left(15); k1 *= c2; h1 ^= k1;
}
{% endhighlight %}

But, it doesn't so nicely scale to larger `switch`es like the 128-bit version of this example code: that one has 15 arms, instead of 3! And, especially for those larger versions, a `switch`/`match` statement seems to **help the optimiser** apply tricks like jump tables or computed-`goto` , whereas individual `if`s seem to end up with **long sequential chains** of compare-then-jump instead ([compiler explorer][ce]).

[ce]: https://godbolt.org/#z:OYLghAFBqd5QCxAYwPYBMCmBRdBLAF1QCcAaPECAMzwBtMA7AQwFtMQByARg9KtQYEAysib0QXACx8BBAKoBnTAAUAHpwAMvAFYTStJg1DIApACYAQuYukl9ZATwDKjdAGFUtAK4sGEgOykrgAyeAyYAHI%2BAEaYxBIAbKQADqgKhE4MHt6%2BASlpGQKh4VEssfFcSXaYDplCBEzEBNk%2BflyB1bUC9Y0ExZExcYm2DU0tue0jvf2l5YkAlLaoXsTI7BzmAMxhyN5YJptuCgT4ggB0CAfYJhoAgje3YbRhmADUXmEEm2YA%2BgSvxFQBFo31eEHen2%2Bf1eqlIr0%2BAA5ocRXvMHiZ/FY7q8AZgCCsGGDVK8Dm5SQD5iT/G4iSTNtd6WDQQBaClozZY%2B7%2BAAi6LMmywNHCNwAnAAlADyABVgt8ILCAJ5ojQiwHAuWK5X3O4fQRQ/4KADuhGQCB%2BEAeOJxuq%2Bv3%2B9AYcMtVpt%2BteAGsuKRndbIXaPWZvdiXX7oe7NkHblaIXr/e7pD6Y7boQgvYnXf6EIH06H/ggIznYymE8HfUX/sg06Wk27kNnqxnocgCw3c69kCWoyHBEj/gAqBp0SkYzk4o0mhAQB0kswJV5cACsWpxI%2BdoiU84XIA9khJC4Z3Neg9oJgXFikp8PpPJlQOo/bTA3Um38b3B6PTDop/Pm0vdLJhyvAid5ro%2BbxcJsL67qe77Ht%2BXBmH%2B16ARoIHVtGVqvn2ByHh2d47iumyHpKMpyvGpBcAi7IWAR2FEe2XD4Qg0H7jhO5odqXbruBZgvpsb5sXBZ5cIxC5Xoc5JmJIHE4tx85cHxAn0UJ56oWJ/43gkMkPk%2BGiKTBgmfieZ6vCKSESYBwEcqBG6mfprHKUZ35AeZAE0qh1noRhHr8XRuG/hyPmEcR0qymYEDhhR/jUUFfnttJgX5kph7hhxNlvEBL5mMlH5fiZ/iuZJCX3nJrz%2BFlOUqa8WnqchNK3p5XFgTiCQVQZjl5TRC6FZZ2mlVuAaVU5JnSbVFnudp3mYdlcV1vh7rZXSIWkeFC0UQkMULa8s0BTRWY5QtaXBqVkgvlwQ2da8v5jW5rxSX1zVXWdF3GTRiE3ZpD22bxHrne1h5VaJ4m3VZJWPQpv0vc5anA%2BSHn3lNOKettbGVvN51La8JFhRFXqLpt52zYhiV/Q5KWMY1K48kdXYAPS068jAKCsbxiLQrwAG6NHgTDRPQCivI0bxeEo6DOsQeIEq8qYznt2XWNL/EK8xaXU3c6I6m2eBUAoFqtuWrwOk6%2BvJv8nqRtGjZm/WXZlqbPkW929vkYW9upo7dtulmHs1pmLa277xY%2B1bDHB22dZhwbzaR/bHYx7223HsOmLOtrYJTowM5zvjdLvjnI4ktWr7/blr0Xh9gENfeGJXsGadQNO5jZ0uudsVIycI0jLGwcNP49TSoPOjXhddvXGeEk3m7DvSbebB3ibF2Tpfwe9sMoZNtGo8VBGY9jZHSJRm27rNFN7d3bHxtpw%2Bp1Q6eN7OU%2Bt/RCHz0XStLypIn93dxVDzyI84jHvfZu0885cFfgHcMUNhIww0pXLSlMqS11HrfBumdJ75xns/DQEDoxQJLlVMyFcB5X3/jfO%2B6CH6YPfCKXBmF3490usBYhrx4YL18qjXaQVd6hTIhGdom0OH0TwolBhF9dp/2QYA1B48s6PyuGxKiVIaIL3lh/XuZVv73UQdfOuMjgHyKwYeaKyiAHTWgTRGqa96oIOrmQvRFCJ5UJbgo%2BiG1TGqIsa8bqLDB7Bl0SgxxcjqFsRcZiMxSM1GMNeq8Ua1jWEby2kTeai02J71WoGSom0ZqcKYlEi%2BxM7FSPhPoyhICn6HkkHQpGpNonOWuvE7RRSzFALKYY98c9lEL1qYZS6q84E2NIcU1pTjymuMPGYapkMCEaKBgMlyOj7GBLQaM9pbcpnIxmZdWBdUEmIJqSjYRp9IY8JWrjCiS50aHNwoU6WPT6KeiGTTHE9NGYMGZhLQWtB2Zc2IDzPmmABZC3eKLcWktiCEhlsreWlhFay2lr/dWPIOCLFoJwBcvA/AcC0KQVAnAySWAVgoZYqw3hbB4KQAgmgUWLHdCABcGh9CcEkJi6luLOC8AUCARlVLsUotIHAWASA0AsGSHQOI5BKAirFfQeIuxDDAC4CKLgjKaC0AIHELlEBohsuiGERoCpOAUr1cwYgCoJTRG0DUXlFKRVsEEBKBgtBDV8tIFgaIXhgBuDZly7gvAsAsAVeIV1%2BAJa1A5oCtlmBVA1C8Bqo1vBPiYDRa6540RiAGo8FgNlBA/ksATaQCNxBohpEwNyTAgajDPCMNSxYVADDAAUAANTwJgQ0EpkiMALfwQQIgxDsCkDIQQigVDqFdboL0Bga2mEJZYfQeBohcsgIsVAyRHACF9cyCUmxeCoCLX8rAS6ICLE6OuvwEBXDjDaEEBg6AZiDAqPkdIZ6r16FSM%2BzI96yhDC9KeuooxmieFaHoP93QANfrmL%2BgDr6oPTBeLMH9J6SVrAkKi9FrLXV4o4DCBECRmQJF3PKow84RRnC4GcDQYJcCEBIDOTY4DeC8q0PMWl9LGUppZaQLFOKsOcu5ZS2taGOBmAwzxjlAm%2BUscLZqzIIBJBAA%3D

Worst of all, that's boring!

Instead, it's possible to **translate** the original C code directly, **fallthrough and all**. All you need is more `break`, like we saw before:

{% highlight rust linenos %}
'outer: {
  'case1: {
    'case2: {
      'case3: {
        match len & 3 {
          3 => break 'case3,
          2 => break 'case2,
          1 => break 'case1,
          _ => break 'outer,
        }
      } // 'case3:
      k1 ^= (tail[2] as u32) << 16;
    } // 'case2:
    k1 ^= (tail[1] as u32) << 8;
  } // case1:
  k1 ^= tail[0] as u32;
  k1 *= c1; k1 = k1.rotate_left(15); k1 *= c2; h1 ^= k1;
}
{% endhighlight %}

Perfect! But.. you might need to bribe someone to get it past code review.

## Break it down for me

What's going on here?

This is relying on Rust's [**labelled blocks & breaks**][labelled-block] acting as a "**forward `goto`**". When we write `'a: { ... break 'a; ... }` that `break 'a` is jumping to the end of the block labelled `'a`. We can use that to jump into the middle of a sequence of instructions.

[labelled-block]: https://rust-lang.github.io/rfcs/2046-label-break-value.html

Here's a strangely-indented version of that same Rust code, which only has whitespace changes from the more conventional formatting just above:

{% highlight rust linenos %}
'outer: { 'case1: {'case2: { 'case3: {

match len & 3 {
  3 => break 'case3,
  2 => break 'case2,
  1 => break 'case1,
  _ => break 'outer,
}

} // 'case3:
k1 ^= (tail[2] as u32) << 16;

} // 'case2:
k1 ^= (tail[1] as u32) << 8;

} // 'case1:
k1 ^= tail[0] as u32;
k1 *= c1; k1 = k1.rotate_left(15); k1 *= c2; h1 ^= k1;

} // 'outer:
{% endhighlight %}

We can pretend the core functionality—all the updates to `k1`—is "straight-line" code, and then the `match` entrypoint is just **choosing where to start executing** within that code. (Maybe that presentation above is clearer to you, or the more conventional one is: the behaviour is the same.)

For instance, if `len & 3` is 2, then the `match` runs `break 'case2`, and jumps to the end of the `'case2` block. That's exactly the `} // 'case2:` line, skipping over `k1 ^= (tail[2] as u32) << 16;`, as desired. Thus, `k1 ^= (tail[1] as u32) << 8;` will run.

Once that update has run, execution continues through the `} // 'case1` (that is, leaving the block labelled `'case1`), on to executing `k1 ^= tail[0] as u32;`: **fallthrough**! Also exactly what's desired!

This is just a unwrapping of the original C code, with an extra "jump" in it (that the optimiser simplifies away).

## I want to break things too

The transformation from C `switch` to Rust `match` is **mechanical** and easy to execute:

1. Configure the blocks
2. Arrange the `match`
3. Insert the code

Here's a C example that demonstrates more `switch` features:

{% highlight c linenos %}
switch (x) {
case 12:
  f1();
  // fallthrough
case 56:
  f2();
  // no fallthrough
  break;
case 34:
  f3();
  // conditional fallthrough
  if (f4()) break;
default:
  f5();
}
{% endhighlight %}

First, start with a `'outer: { ... }` block. For each `case` or `default` statement, create a `'...: { ... }` block nested within `'outer` and within each other. Put the **last** `case`/`default` **outermost**, and the **first** one (immediately after `switch`) **innermost**, with the rest in order between the two.

{% highlight rust linenos %}
'outer: {
  'default: {
    'case34: {
      'case56: {
        'case12: {
        }
      }
    }
  }
}
{% endhighlight %}

Next, within all of the blocks, create a `match` with an arm for each `case`/`default`, and contents `break '...`:

{% highlight rust linenos %}
'outer: {
  'default: {
    'case34: {
      'case56: {
        'case12: {
          match x {
            12 => break 'case12,
            56 => break 'case56,
            34 => break 'case34,
            _ => break 'default,
          }
        }
      }
    }
  }
}
{% endhighlight %}

Finally, put the code for each arm **immediately after** the matching labelled block (this is slightly unintuitive: code for case "X" should **not** be nested within the `'caseX` block). Replace any `break` statements in C with `break 'outer` in Rust.

{% highlight rust linenos %}
'outer: {
  'default: {
    'case34: {
      'case56: {
        'case12: {
          match x {
            12 => break 'case12,
            56 => break 'case56,
            34 => break 'case34,
            _ => break 'default,
          }
        }
        f1();
        // fallthrough
      }
      f2();
      // no fallthrough
      break 'outer;
    }
    f3();
    // conditional fallthrough
    if f4() { break 'outer; }
  }
  f5()
}
{% endhighlight %}

That's the whole process.

## Why break Rust like this?

There's a few places where C's `switch` fallthrough behaviour is particularly useful, often numeric-related "tight" code, like: hash functions like MurmurHash3 above, and [prime sieves][prime]. Using fallthrough leads to simpler code that's well optimised by the compiler.

The same logic applies to Rust: in the rare case it's helpful, it can be very helpful... except it's so awkward to express in Rust, that there's no defining this as "simpler". This only makes sense if **benchmarks prove it** .

(This is a quick article so I haven't done the legwork to construct an example microbenchmark that demonstrates the performance impact of appropriate use of fallthrough: walking through that would be an article itself. Now you know about this idiosyncratic technique you can experiment... and maybe even write that article yourself!)

[prime]: https://github.com/kimwalisch/primesieve/blob/fa952ab19642b00687513d26e668d238180cb67c/src/EratSmall.cpp#L102-L127

This labelled-break techinque is also a special case of a more general possibility: labelled breaks can be used to implement **any directed acyclic graph** of C `goto`s. The `switch` fallthrough is a simple linked-list graph (each case/state goes to one other case), but the technique can be used for more complicated graphs too:

1. create a nested labelled block for each state, in **reverse topological order**, then
2. use `break '...` to jump to the appropriate less-deeply-nested block when transitioning states.

This "feature" should be used... carefully. It's clearly hard to understand, and would be hard to maintain by hand, especially as the number of cases grow larger. However, it may be a good trick to use within a macro or other code-generation.

## Short breakdown

One can (ab)use labelled breaks in Rust to support fallthrough-like behaviour in `match`. Not at all pretty, not at all advisable, but it works, and sometimes that's as much as we can hope for.

The <a href="https://github.com/pythonesque/fallthrough">pythonesque/fallthrough</a> and <a href="https://github.com/Jules-Bertholet/fallthrough">Jules-Bertholet/fallthrough</a> macros appear to automate the transformation and seem to make it prettier... although I haven't used them.

{% include comments.html c=page.comments %}
