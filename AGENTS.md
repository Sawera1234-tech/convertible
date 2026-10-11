<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep conversion jobs and output audio in local IndexedDB, not a remote service, so offline conversion and recovery remain private.
- Use a shared theme toggle to set the root dark class, following system preference until an explicit device-local choice is saved; global semantic tokens theme all converter views.
