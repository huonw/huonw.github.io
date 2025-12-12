---
layout: default
title: "magit-insert-worktrees improves status buffers"

description: >-
    When using Emacs' Magit and Git worktrees, adding the magit-insert-worktrees section inserter gives an nice overview of them in the status buffer.

comments:
---

The Magit package for Emacs is my Git UI of choice, and git worktrees are very convenient. They mesh up particularly well by adding the built-in `magit-insert-worktrees` to `magit-status-sections-hook`. With this, the magit status buffer shows a summary of the branch/HEAD/path of all worktrees, and allow jumping between them in a flash.

{% highlight emacs-lisp linenos %}
;; Show all worktrees at the end of the status buffer (if more than one)
(add-hook 'magit-status-sections-hook #'magit-insert-worktrees t)
{% endhighlight %}

{% include image.html src="example.png" caption="A magit status buffer with all the usual features, plus the new 'Worktrees' section at the end: the outlined row with an absolute path is the worktree for the current status buffer, and the other two are elsewhere on disk. Hitting RET on any worktree switches to it." alt="A screenshot of a magit status buffer, with several sections: the default 'Head' with the 'huonw/magit-insert-worktrees-docs' branch checked out, a partially expanded 'Unstaged changes (1)' section with a change to the 'docs/magit.org' file, a collapsed 'Recent commits' section, and then a 'Worktrees (3)' section, with three lines: 'huonw/magit-insert-worktrees-docs' branch (blue, outlined) at ~/projects/magit/magit, 'main' branch (blue, no outline) at ../magit2/, and then a detached HEAD commit hash (yellow, no outline) at ../magit3/." %}

<aside data-icon="ℹ️" markdown="1">
This post is about a particular feature of the [Magit](https://magit.vc/) package for interfacing to [Git](https://git-scm.com/) within [Emacs](https://www.gnu.org/savannah-checkouts/gnu/emacs/emacs.html). I can't say enough good things about Magit (it's both incredibly powerful but also accessibly surfaces & teaches so much of the raw git interface; even when I've been written code in a different editor, I'll still use Magit to interact with Git)... but I also am not going to excessively extol its virtues or explain all the details here, as [others](https://www.masteringemacs.org/article/introduction-magit-emacs-mode-git) have [already](https://emacsair.me/2017/09/01/the-magical-git-interface/) done [so](https://emacsair.me/2017/09/01/magit-walk-through/).
</aside>

## Worktrees

Git has a feature called [worktrees][wt], which are a nifty way to do work in parallel: different branches checked out in different directories, but all sharing a single `.git` directory. This means less disk space used on duplicate `.git` clones, but, more usefully, data like branches & stashes is shared.

[wt]: https://git-scm.com/docs/git-worktree

There's lots of ways to use worktrees, and they're especially handy in the age of AI agents. At the most basic level, they're **useful for working concurrently**, like [reducing context switching when balancing deep projects, code reviewing, and small fixes][worktrees-and-pyenv].

[worktrees-and-pyenv]: {% post_url 2020-04-15-worktrees-and-pyenv %}

I know some people like to create a new worktree for each branch they work on, and then remove them once finished (or get their agents to do so). I personally generally have fixed long-lived worktrees[^why-fixed] that I cycle branches through as required: for my main work repo, I'm up to `name`, `name2`, ..., `name5` at the moment... and if I ever need a 6th one, I'll just create it.

[^why-fixed]: I've settled on long-lived worktrees for two reasons:
    1. IME many code-bases have at least a little bit of static setup that's intentionally not tracked in Git (like initialising an `.env` file from an `.env.example` file), and starting a new worktree requires redoing this... this can be solved with scripts, or just be side-stepped.
    2. I have an (arguably bad) habit of taking notes, leaving reference data and/or creating ad-hoc scripts in untracked files in a worktree, and sometimes want to return to them and persist them later (commit, or paste into a issue tracker, or similar), so creating then _deleting_ worktrees risks accidentally losing them.


## Finding the worktrees

In either case, I find it annoying to keep track of what worktrees are 'live'. There's workable solutions, but they're a bit of friction:

- CLI: run `git worktree list` or some alias.
- Magit: hit [keybinding `Z g` in magit buffers][wt-docs] to see a switcher.

[wt-docs]: https://docs.magit.vc/magit/Worktree.html

The magit status buffer is the entry-point to a Git repo, and surfaces a lot of information that's handy to have immediately available, in collapsible sections, things like diffs of any uncommitted and branch summaries. It reduces friction by making `git status`/`git diff`/... automatic and interactive, and is customisable.

I wanted to apply that mindset to worktrees too, and so, recently, started writing my own worktree section inserter... but then thought to double check the Magit source code for anything similar, and found exactly what I wanted[^docs]!

Magit has a [builtin `magit-insert-worktrees` function][func] that inserts a section **summarising all worktrees** (or nothing, if there's only one worktree). It's **interactive**: hitting `RET` on any worktree shows the magit status buffer for it.

It's not used by default, so it needs to be **explicitly enabled** by adding to the hook that the status buffer executes to show all the sections. My init files now include:

[func]: https://github.com/huonw/magit/blob/5c7dab418361e65d4efcb490d87dcb4887f630d5/lisp/magit-worktree.el#L247-L276
[^docs]: This function appears to have existed since 2016, but not be mentioned in the manual, so I submitted [an addition][pr].

[pr]: https://github.com/magit/magit/pull/5492

{% highlight emacs-lisp linenos %}
;; Show all worktrees at the end of the status buffer (if more than one)
(add-hook 'magit-status-sections-hook #'magit-insert-worktrees t)
{% endhighlight %}

My status buffers now look like the screenshot above. Yay!

{% include comments.html c=page.comments %}
