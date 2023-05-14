# Changelog

<!-- 
added: New feature
fixed: Bug fix
changed: Feature change
deprecated: New deprecation
removed: Feature removal
security: Security fix
performance: Performance improvement
other: Other 
-->

## [Unreleased]
- Sorry for my English, I use a translator. :)

## [v1] - 2022-02-03
### Added
- Initial release.

## [v2] - 2022-02-04
### Fixed
- Change GLib.idle_add() to 'realize' signal in buildPrefsWidget (prefs.js).
- Add settings-schema and gettext-domain in metadata.json.
- Remove unnecessary imports.
- Fix indentations.
- Elimination of unnecessary logs.
- Thanks JustPerfection!!!

## [v3] - 2022-02-05
### Added
- Add alernatives thresholds paths.
- Add available flag and the _init code is restructured according to this addition... Now the submenu is shown even if the thresholds are not available.
### Fixed
- Fix _available function. The test whether the files exist points to the start file twice!

## [v4] - 2022-02-21
### Added
- Add icon type option (symbolic/color).

## [v5] - 2022-02-21
### Fixed
- Fix icon type on start.

## [v6] - 2022-03-16
### Added
- Threshold related functions have been moved to a library and optimized.
- The option to apply the thresholds to the battery of the dock is implemented if it is available (try this, I don't have a dock!!!)
- Added option to show/hide current values in menu.
- Added tooltips in menu icons.
### Changed
- The settings are applied immediately except for the thresholds that will be applied the next time they are activated from this extension or using the button for this purpose in the preferences window.
- Remove thresholds limits.
### Performance
- Function to apply thresholds now use promise (async) and can catch errors.
- Function to apply thresholds now checks if are available to determine what can be applied (more compatibility?).
### Fixed
### Other
- Reformat strings.
- Icons are redesigned... something.
- Minor cosmetic changes. 

## [v7] - 2022-03-21
### Fixed
- If the action of applying the thresholds is canceled, now it does not throw an error.
- Update error notification message.
- Fixed the problem that the state switch was not updated to the correct state in case of an error.
- Fixed texts.
### Other
- Change schema settings types.
- Preferences UI was moved to a .ui file and Gtk4 is implemented with cosmetic improvements.
- Files names changed.
### Changed
- The buttons to apply the thresholds on the settings page are removed... I didn't like it :)
- Validate availability before applying the threshold in extension.js.
- Update metadata information.
### Performance
- Improvements to file monitors to avoid repeated execution of the callback.
- Change GtkComboBoxText to GtkDroopDown.
### Added
- Added an option to show/hide tooltips.
- Gnome 42 and libadwaita compatibility.

## [v8] - 2022-03-27
### Performance
- Threshold write performance improvements (fewer writes). Inspired by [TLP](https://github.com/linrunner/TLP/blob/main/bat.d/05-thinkpad)
- Russian translation update (Andrey Sitnik)

## [v9] - 2022-03-28
### Fixed
- Russian translation update (Andrey Sitnik)

## [v10] - 2022-05-25
### Added
- Gnome 42 icons
- Added a menu to apply the configured values
- Added option to disable notifications
### Changed
- Revert switch to menu
### Other
- Update icons

## [v11] - 2022-05-30
### Fixed
- Russian translation update (Andrey Sitnik)

## [v12] - 2022-10-08
### Added
- Add option to show icon on inactive thresholds (based on the proposal of [Riccardo Massidda](https://gitlab.com/marcosdalvarez/thinkpad-battery-threshold-extension/-/issues/3))
- Gnome 43 compatibility (QuickSettings) - First attempt... many TODOs
### Fixed
- Dock battery callbacks

## [v13] - 2022-10-16
### Fixed
- Issue [#5](https://gitlab.com/marcosdalvarez/thinkpad-battery-threshold-extension/-/issues/5): Bad function name
- Warnings fixes

## [v14] - 2022-11-28
### Performance
- Completely rewrites the "driver" using (or trying to) the GObject model
- Part of the "indicator" is rewritten
- Some text strings were modified to adapt them (The driver does not show text)
### Changed
- Thresholds can now be adjusted with 1% intervals
### Removed
- Support for versions older than Gnome 43 is removed. (Older versions of the extension are functional on Gnome 41/42)

## [v15] - 2022-12-01
### Fixed
- Fix platform detection (wrong regular expression)

## [v16] - 2022-12-23
### Added
- Added the option to reset the recommended thresholds on the preferences page
- Added the option to reset all preferences
### Other
- Move preference pages to separate classes
- Moved links to preferences window menu. Based on the excellent <b>[GNOME Shell Extension - Blur my Shell](https://github.com/aunetx/blur-my-shell)</b>: All credits to [Aurélien Hamy](https://github.com/aunetx)

## [v17] - 2022-12-27
### Other
- Update translations

## [v18] - 2023-01-03
### Other
- Update translations

## [v19] - 2023-01-24
### Fixed
- Issue [#8](https://gitlab.com/marcosdalvarez/thinkpad-battery-threshold-extension/-/issues/8): On some models the start threshold 0 is not allowed, instead 95 is used (Ex: E14 Gen 3)
### Other
- Update translations

## [v20] - 2023-01-27
### Other
- Update translations

## [v21] - 2023-03-07
### Added
- Environment object (kernel, product)
### Fixed
- Kernel version check

## [v22] - 2023-03-10
### Fixed
- Fix error "batteries is null" if platform is not supported
### Added
- Added support for Gnome 44

## [v23] - 2023-03-11
### Fixed
- Remove duplicate kernel version message with debugging enabled
- Fixed error when checking if there are pending changes to apply in the driver
### Other
- (dis)connectObject is changed to connect/disconnect in the driver and battery classes because they are not GJS standards and it is not possible to use these classes in the preferences
### Added
- Suggestion [#11](https://gitlab.com/marcosdalvarez/thinkpad-battery-threshold-extension/-/issues/11): Added buttons in preferences window to apply thresholds (if battery is available)
### Changed
- Now, the reset thresholds button in preferences window also tries to apply the values
- Now, the pending-changes property is true even if the thresholds are not active

## [v24] - 2023-03-13
### Added
- Added dialog messages to the reset buttons in the preferences window
### Changed
- Debug mode now takes effect immediately without the need to restart the extension
- The "Force compatible models" option is renamed to "Disable model compatibility check" and the value is also reversed (false = check compatibility - default)

## [v25] - 2023-03-15
### Other
- Update translations

## [v26] - 2023-03-17
### Other
- Update translations

## [v27] - 2023-04-01
### Fixed
- Fixed non-detection of attribute changes of the threshold files

## [v28] - 2023-04-03
### Other
- Update translations

## [v29] - 2023-04-10
### Fixed
- Fixed bug in preferences window if platform is not supported

## [v30] - 2023-04-15
### Other
- Update translations

## [v31] - 2023-04-19
### Fixed
- Fixed signal assignment in preferences window

## [v32] - 2023-04-24
### Fixed
- Issue [#15](https://gitlab.com/marcosdalvarez/thinkpad-battery-threshold-extension/-/issues/15): Incorrect positioning on gnome 44 (Thanks @KayJay7)