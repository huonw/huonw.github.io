---
layout: default
title: Writing
no_toc: true
---

Some posts, grouped by topic. See [all posts, listed chronologically](/blog).


## Rust

[*Some notes on Send and Sync*][snosas]
: The `Send` and `Sync` traits in Rust are cool, here are two edge-ish
  cases.

[*What does Rust's unsafe mean?*][wdrum]
: Exploring Rust's escape hatch for writing low-level code that the
    type system cannot guarantee to be safe.

[*Little libraries*][ll]
: On focused libraries in Rust.

### Trait objects

[*Peeking inside Trait Objects*][pito]
: An introduction to the low-level details of trait objects.

[*The Sized Trait*][tst]
: A short summary of the Sized trait and dynamically sized types.

[*Object Safety*][os]
: An overview of so-called "object safety", and why it is necessary
   for trait objects.

[*Where Self Meets Sized: Revisting Object Safety*][wsmsros]
: `where Self: Sized` now offers new flexibility for writing
   object-safe traits.

### Infrastructure/tooling

[*Rust infrastructure can be your infrastructure*][ricbyi]
: Homu and highfive were created for rust-lang, but you can easily
  benefit too.

[*Helping Travis catch the rustc train*][htctrt]
: Manually configuring Travis CI to handle the Rust release trains and
  upload documentation is annoying. Getting a script to do it is far
  less annoying.

[*Travis on the train, part 2*][tottp2]
: travis-cargo got some improvements, including support for recording
  test coverage via coveralls.io.


[pito]: {% post_url 2015-01-10-peeking-inside-trait-objects %}
[tst]: {% post_url 2015-01-12-the-sized-trait %}
[os]: {% post_url 2015-01-13-object-safety %}
[wsmsros]: {% post_url 2015-05-06-where-self-meets-sized-revisiting-object-safety %}
[ricbyi]: {% post_url 2015-03-17-rust-infrastructure-can-be-your-infrastructure %}
[htctrt]: {% post_url 2015-04-28-helping-travis-catch-the-rustc-train %}
[tottp2]: {% post_url 2015-05-01-travis-on-the-train-part-2 %}
[snosas]: {% post_url 2015-02-20-some-notes-on-send-and-sync %}
[wdrum]: {% post_url 2014-07-24-what-does-rusts-unsafe-mean %}
[ll]: {% post_url 2015-04-27-little-libraries %}
