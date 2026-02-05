---
layout: default
title: "Is that a deprecation? Or is it just removed?"

description: >-
    It's useful to have a specific label for "make changes that discourage use of some code", different to "remove the code".

hashtags: []
comments:
---

I've noticed different people seem to use the word "deprecating" to mean two different things, when it comes to code and/or features: either removing entirely, or discouraging its use. I think it's useful to have specific labels for both of these of concepts, so that communication is clearer.

When you want to **discourage new users** of some existing code/feature, and...

- existing users **continue working** for now, call it **deprecating**
- existing users **stop working** immediately, call it **removing** (or deleting, renaming, or... something else, as appropriate)

Rephrased: describing the removal of *X* as "*X* is deprecated" is misleading: a reader may expect that *X* is still usable, merely discouraged. This confusion may lead to the reader expecting that they've got some time migrate away from *X*, but, no, they must stop using it right now.

This is English-language pedantry, but I'm trying not to be overly prescriptive here, but rather observe that there's two concepts, and having separate labels for separate concepts is useful. My understanding of common labels is above, maybe you have different ones... but either way, it's helpful if most of us are on the same page.

## Making it happen

If we're fine to break all consumers of a piece of code or a feature, then removing is easy: just delete that code. Maybe it's an internal function, and thus we know for sure that there's no more consumers.

If we're wanting to allow consumers to keep working (for now), there's a many ways that we can communicate the deprecation, such as:

- Update documentation, including highlighting the change in a changelog/release-notes.
- If it's a feature that appears in a UI of some sort, add descriptive "use something else" text when users use it.
- If it's a code function, use language features like, for instance:
  - In Python, [the `@deprecated` decorator][python] and/or manually emitting [runtime `DeprecationWarning`s][python-warning] are good choices.
  - In Rust, [the `#[deprecated(...)]` attribute][rust] does what's desired.
  - In JavaScript and TypeScript, [JSDoc's `@deprecated` tag][jsdoc] is relevant.
  - In a GraphQL API, one can use [the `@deprecated` directive][gql] in a schema, and generated clients may even convert this into their own native deprecation marker like those above.

[python]: https://docs.python.org/3/library/warnings.html#warnings.deprecated
[python-warning]: https://docs.python.org/3/library/exceptions.html#DeprecationWarning
[rust]: https://doc.rust-lang.org/reference/attributes/diagnostics.html#r-attributes.diagnostics.deprecated
[gql]: https://spec.graphql.org/October2021/#sec--deprecated
[jsdoc]: https://jsdoc.app/tags-deprecated

With any of these, tooling may give warnings that migration is needed, but the functionality will still work (for now).

## Removing is different to deprecating


I occasionally see people say they're "deprecating" something, when they're actually completely removing it. Deprecating in the sense of "discourage use"/"emit warnings" is a useful action, and it seems valuable to have a specific term for it.

Are you discouraging usage, but it still works? That's **deprecating**.

Are you stopping all usage? That's **not** deprecating.

{% include comments.html c=page.comments h=page.hashtags %}
