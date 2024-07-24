---
layout: default
title: "GitHub tip-hub: habitual permalinks"

description: >-
  Hit y to create a permalink to a GitHub directory, file or line. They're easy to make, stable, and even render a preview in some places.

style: >-
  .wrapped-code > pre {
    white-space: break-spaces;
  }
  .wrapped-code {
    padding: 0 1em;
    word-break: break-all;
  }
  [data-lang="markdown"]::before { display: none;  }

comments:
---

GitHub offers permalinks to versions of files and lines, within a repository. They're easy to create (`y` keyboard shortcut) and have some nifty affordances like displaying a preview, plus they don't become invalid as code changes. Use them!

The permalinks use the commit hash of a particular version of the file, and thus the contents never changes, because they're content-addressed and permanent[^permanent]. This is true even as the code evolves: a permalink to a particular line will always be **what you intended**, whether future versions add or remove code around it, or even move or delete the file entirely.

I can't think of many downsides to using permalinks, so consider **always pressing `y`** before sharing a GitHub file link. Make it a habit.

[^permanent]: Not actually permanent: GitHub will itself eventually disappear, breaking _all_ such links; a repository may be deleted; the repository may have history rewritten to erase the commit.

## Creating a permalink

Hit `y` on any file or directory view, then copy the updated link from the browser's URL bar.

When viewing a file, you can click on the line number gutters to link to a single line, or range (shift click). These also update the browser's URL bar.

(Also good: a plugin for your editor, so you can jump around files locally and create links without having to refind the same files in the GitHub web UI. I use [git-link], but know nothing about plugins for non-Emacs editors.)

The GitHub docs also discuss how to link to [files] and [lines].

[git-link]: https://github.com/sshaw/git-link
[files]: https://docs.github.com/en/repositories/working-with-files/using-files/getting-permanent-links-to-files
[lines]: https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-a-permanent-link-to-a-code-snippet

## Pretty pictures

Pasting a GitHub permalink into some software, including GitHub itself, has some sometimes-nice affordances.

For GitHub, putting a permalink into a comment box, PR or issue descriptions renders the referenced code snippet:

{% include image.html src="comment.png" alt="a part of a comment from GitHub that includes a rendering of the link above" width="1832" height="412" %}

The contents of that comment is just normal Markdown text, plus a link, nothing else:

{% highlight markdown %}
One option might be evolving the `test_using_pyenv` test to take two parameters like `("interpreter_constraints", "expected_version_substring")`, and then pass `("2.7.*", "2.7"), ("3.9.*", "3.9"), ("3.10.4", "3.10.4")` or something like that. What do you think?

https://github.com/pantsbuild/pants/blob/cfb3cafcac2386c909bc4a3fee3997e1bd8b03d7/src/python/pants/backend/python/providers/pyenv/rules_integration_test.py#L65-L66
{% endhighlight %}{:.wrapped-code}

This rendering doesn't work for a whole file permalink (without the `#L...` fragment), and doesn't work across repositories. In those cases, providing a permalink still helps for future, in the cases you come back to it.

Other software like Slack also seems to handle GitHub links, providing snippets and previews.

## What is it, actually?

Compare these two URLs to lines 65 and 66 of the `.../pyenv/rules_integration_test.py` test file linked above, within [Pants](https://github.com/pantsbuild/pants):

- <code class="break-all">https://github.com/pantsbuild/pants/blob/<strong>main</strong>/src/python/pants/backend/python/providers/pyenv/rules_integration_test.py#L65-L66</code>
- <code class="break-all">https://github.com/pantsbuild/pants/blob/<strong>71749c04c7cf3cd9c22aea3e99fded57d5f41ebc</strong>/src/python/pants/backend/python/providers/pyenv/rules_integration_test.py#L65-L66</code>

They're almost identical except for the bolded `blob/.../src` section. That difference communicates where to find the files[^commitish], one uses mutable reference (branch name) while the other uses an immutable commit hash.

[^commitish]: I think [any reference to a commit](https://git-scm.com/docs/gitrevisions) works in these URLs, including tags, parent references `71749c04^^` and branch time-machines `main@{3 months ago}`. The latter two are probably just curiosities, but tags links are definitely useful!

At the time of writing, the two URLs show a file with identical contents, but they have different meanings and so this won't always be true.

[`71749c04`] is the most recent commit to Pants' `main` branch, which is why they currently match. But once PR #21139 lands in `main` with [its improved test][test], this file on `main` will have different content to `71749c04`. The first branch-ful link will show the new contents.

Presumably the link is being a reference for something, so having it **change accidentally** is not good. You might come back in a few days, weeks or months and try to track down the context for something: in the best case, you'll get lucky and the code hasn't changed. In the worst case, the file in question has been deleted or moved, so the link is a 404. You might be able to do some git archeaology to guess what's it's referring to but that's a lot of fuss!

Using the permalink is **minimal effort** and **sidesteps potential problems**.

[`71749c04`]: https://github.com/pantsbuild/pants/commit/71749c04c7cf3cd9c22aea3e99fded57d5f41ebc
[test]: https://github.com/pantsbuild/pants/pull/21139/commits/58b83e3ca63d169ce26798809de63c94a540e8f5

## Sometimes the latest version is useful?

In some cases, having an "evergreen" link pointing to always the latest version is useful, and so using the branch-ful link might be appropriate... but I think this is rarer than one might expect, and has consequences.

Linking to a specific older version might be confusing if the code has moved in the current version. However, it's a permalink, so it's showing the **exact code of interest**. You can use any of your **normal code discovery tools** (from wild guesses to grep to AI) to find its new location. There's no way to have a single evergreen link to "file `foo/bar/baz.py` even if it moves" or particular lines[^search].

[^search]: You could link to [a search query](https://github.com/search?q=repo%3Apantsbuild%2Fpants%20py_version%20test_using_pyenv&type=code) but that feels a bit unreliable. There's some cases where it definitely makes sense, though!

In terms of consequences: if a non-perma link to a specific file is published somewhere, that location should now **always** have a real file, or else that link breaks. Git and GitHub don't provide any tools for redirects (that I know of!), so if the file needs to move, a file has to be left in the old spot as breadcrumb to find the new location.

## Non-GitHub forges

I am not as familiar with Gitlab and other GitHub competitors: I imagine most have similar functionality for permalinks to a particular version of a file and its lines.

From a quick test, Gitlab looks to share the `y` keyboard shortcut, and line-linking behaviour.

## Summary

Creating permalinks to code in GitHub is easy (hit `y`) and has benefits with few downsides.

Consider making it a habit to always use them instead of branch-ful non-perma links.
