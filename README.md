# MP3 Converter Pro

Build a simple, modern, fast and mobile-friendly Video to MP3 Converter Web App.



Main Goal



The app should allow users to select/upload multiple video files at once and convert all of them into MP3 audio files in one batch.



The app must be installable on Android, iPhone, tablet and desktop as a PWA (Progressive Web App).



Core Features



1. Multiple Video Upload



- Add a large drag-and-drop upload area on the homepage.

- Button text: “Select Videos”

- Users can select multiple videos at the same time.

- Support common video formats such as:

  - MP4

  - MOV

  - AVI

  - MKV

  - WEBM

  - M4V

- Show all selected videos in a list before conversion.

- Each video should show:

  - File name

  - File size

  - Video format

  - Remove button



2. Batch Conversion



- Main button: “Convert All to MP3”

- When clicked, convert every selected video to MP3 automatically.

- Process the videos one by one or using an efficient queue.

- Show individual progress for every video.

- Show overall batch progress.

- Status examples:

  - Waiting

  - Converting

  - Completed

  - Failed



3. MP3 Output



- Output format must be MP3.

- Preserve the original video filename and replace the extension with ".mp3".

- Example:

  "My Video.mp4" → "My Video.mp3"



4. Download



- After conversion, show a Download button for each MP3.

- Also provide a large “Download All” button.

- Download All should download all converted MP3 files, preferably as a single ZIP file.

- Do not require users to download each file manually.



5. Clear All



- Add a “Clear All” button.

- It should remove the selected and converted files from the current session.



Privacy / Processing



Prefer client-side processing using FFmpeg WebAssembly (ffmpeg.wasm) so that videos can be converted directly inside the user's browser/device.



Do NOT upload user videos to a server unless absolutely necessary.



Show a small privacy message:



“Your videos are processed locally on your device. Your files are not uploaded to our server.”



If browser/device limitations prevent local conversion for a particular file, show a clear error message instead of silently failing.



UI / Design



Make the UI extremely simple because the app is intended for normal mobile users.



Homepage structure:



1. App logo/name at top

2. Short description

3. Large upload box

4. Selected video list

5. Convert button

6. Conversion progress

7. Completed files

8. Download All button



Use a clean modern design with:



- White/light background

- Rounded cards

- Modern typography

- Subtle shadows

- Simple icons

- Responsive mobile-first layout

- Fast and uncluttered interface



On mobile, the upload area should be large and easy to tap.



App Name



Use:



Video to MP3



Subtitle:



Convert multiple videos to MP3 instantly



PWA Requirements



Make the application a proper installable PWA.



Include:



- "manifest.json"

- Service worker

- App icons

- Standalone display mode

- Theme color

- Offline app shell where practical

- “Install App” button/prompt when installation is available



When installed, it should open like a normal mobile app without browser UI.



Technical Requirements



Use a modern production-ready frontend.



Prefer:



- React

- TypeScript

- Tailwind CSS

- FFmpeg WebAssembly

- PWA support



Do not create unnecessary backend/database/authentication features.



This is a utility app, so users should be able to open it and immediately start converting videos without creating an account.



Error Handling



Handle:



- Unsupported file types

- Very large files

- Conversion failures

- Browser memory limitations

- User cancelling conversion

- Duplicate filenames

- Empty upload

- Multiple simultaneous conversions



Show friendly messages instead of technical errors.



Example:



“This video could not be converted. Please try another video or a smaller file.”



Important UX Behavior



After the user selects multiple videos:



Example:



Video 1.mp4     ⏳ Waiting

Video 2.mp4     ⏳ Waiting

Video 3.mov     ⏳ Waiting

Video 4.mkv     ⏳ Waiting



Then after pressing Convert All:



Video 1.mp3     ✅ Completed

Video 2.mp3     🔄 Converting 65%

Video 3.mp3     ⏳ Waiting

Video 4.mp3     ⏳ Waiting



When everything finishes:



🎉 All videos converted successfully



[ Download All MP3 ]



Important



Keep the application very simple.



Do not add:



- Login/signup

- User accounts

- Payment

- Database

- Social features

- Unnecessary settings

- Complicated menus



The primary workflow must be:



Select Multiple Videos → Convert All → Download All MP3



Before finishing, test the complete flow and make sure the app actually converts real video files to valid MP3 files rather than creating fake/demo download files.



Make the final result polished, responsive, installable and production-ready.Enable a proper FULL OFFLINE MODE for my existing Video to MP3 Converter PWA.



Do NOT redesign or remove any existing functionality. Keep the current UI, batch conversion, MP3 conversion, download, Download All, progress indicators and everything else exactly as it is.



Offline Requirements



I want the app to work without an internet connection after the user has opened/installed it once and the required files have been cached.



The complete conversion workflow should work offline:



Open App → Select Multiple Videos → Convert to MP3 → Download MP3 files



No internet connection should be required for conversion.



FFmpeg Offline



The most important requirement is that the FFmpeg WebAssembly conversion engine and all required FFmpeg WASM assets must be cached locally.



On the first online visit:



1. Download/load the FFmpeg engine.

2. Cache the required FFmpeg WASM files.

3. Cache all required JavaScript/CSS/assets.

4. Store everything required for the converter to run offline.



After this initial setup, the app must NOT try to download FFmpeg again when the user is offline.



If FFmpeg is already cached, initialize it directly from the local cache.



Service Worker



Improve the existing PWA service worker to provide reliable offline support.



Cache:



- App shell

- HTML

- JavaScript

- CSS

- Fonts if used

- Icons

- Manifest

- FFmpeg WebAssembly files

- FFmpeg core/worker files

- Any other static assets required for conversion



Use an appropriate Cache Storage strategy.



For application assets, use cache-first/offline-first behavior.



Offline Startup



When the user opens the installed app without internet:



- App should open normally.

- No blank screen.

- No network error.

- No loading screen waiting forever for a server.

- Existing UI should be available.

- User should be able to select local videos.

- Conversion should work completely offline.



First-Time Setup



Because FFmpeg is around 30 MB, show a one-time setup indicator on the first online launch:



Preparing Offline Converter…



Show download/loading progress if technically possible.



When finished:



✓ Offline Converter Ready



After that, the user can use the converter without internet.



Do not require the user to manually download anything.



Offline Status



Add a small unobtrusive status indicator:



🟢 Offline Ready



when all required conversion assets are cached.



If the required FFmpeg files have not yet been downloaded, show:



Internet required for first-time setup



Once setup is complete, change it to:



✓ Ready to use offline



Important



The offline mode must NOT simply cache the website UI.



It must also cache the actual FFmpeg conversion engine, because the main purpose is to convert videos to MP3 without internet.



Test this carefully:



1. Open the app while online.

2. Let FFmpeg finish downloading/loading.

3. Install the PWA.

4. Close the app.

5. Turn OFF Wi-Fi and mobile data.

6. Open the installed app.

7. Select multiple local video files.

8. Click Convert All to MP3.

9. Confirm that the videos actually convert to valid MP3 files.

10. Confirm Download / Download All still works offline.



Updates



I understand that aggressive caching can sometimes prevent updates.



Therefore implement a safe versioning strategy:



- Use versioned cache names.

- When a new app version is deployed, the service worker should install the new cache in the background.

- Do NOT delete the currently working cache until the new cache has successfully installed.

- Activate the new service worker safely.

- Make sure users do not get stuck with a broken/offline version.



Do Not Change



Keep these existing features exactly as they are:



- Multiple video selection

- Batch conversion

- MP3 output

- Individual progress

- Overall progress

- Download buttons

- Download All

- Clear All

- Mobile responsive UI

- PWA installation

- Existing design



Final Requirement



This must be a real offline converter, not just an offline webpage.



The final test must prove:



Internet ON → First-time setup → FFmpeg cached → Internet OFF → Multiple videos selected → Real MP3 conversion succeeds.



Make the necessary code changes and test the complete offline workflow.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://convertible.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/043271aa-44e2-42b0-acce-5df7fb49af4b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
