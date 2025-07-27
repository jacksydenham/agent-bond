# Agent Bond

**Demo Video:** [Click Here](https://youtu.be/jhei7UBwx9g)  
> **Live Deployment:** *Not currently hosted*  
> The Discord bot component needs an always‑on service to run, which isn’t practical for a personal project.  
> If you’d like to try it live, I can spin up a short‑term demo. Just reach out via [jacksydenham.dev](https://jacksydenham.dev).

Agent Bond is an AI‑powered agent that joins your Discord voice channel, transcribes live speech via Azure Cognitive Services, then uses GPT‑4 to automatically perform Jira actions, moving or creating tasks with an approval step before execution for full transparency and security.

## Challenges & Solutions

- **Pivot from Teams to Discord**  
  **Challenge:** Enterprise licensing and Teams policies blocked personal external hooks and custom apps.  
  **Solution:** Redesigned Agent Bond as a self‑hosted Discord bot, with raw Opus audio streams decoded to PCM and streamed into Azure STT while seamlessly integrating our GPT‑4 parser and approval UI.

- **Seamless UX Across Platforms**  
  **Challenge:** Preserving the interactive approval flow and toast notifications from the Teams prototype in Discord.  
  **Solution:** Leveraged *react‑hot‑toast* to implement the same approve‑then‑execute prompt, styled to match the original design, ensuring the intended experience was delivered.

## Future Improvements

- **Secure OAuth Token Storage**  
  Move the OAuth flow from a simple Node/Express cookie to storing access & refresh tokens in Azure Key Vault.

- **Enhanced LLM Capability**  
  Expand the LLM context window for more natural commands (“this ticket, that issue, etc.”) and comment creation.

- **GitHub–Jira Sync**  
  Detect pull requests that reference Jira issues and automatically post the PR link as a comment on the corresponding ticket.
