# Converter improvements

- [x] Add a persistent dark-mode toggle while preserving the layout.
- [x] Test real offline conversion, saved results, interruption recovery and MP3/ZIP downloads in Chromium; both completed outputs retained after closing, interrupted job restarted once and completed.
- [ ] Verify installed offline cold startup: blocked because localhost development disables the production service worker; requires the updated published app.
- [x] Explain download destinations and Android music-player limitations accurately; playable MP3s verified, browser downloads captured locally.
- [ ] Verify actual Android app switching, OS termination, download destination and music-player discovery: requires an Android device, unavailable in this environment.