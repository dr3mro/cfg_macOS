/* 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.    See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.    If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 * 
 * CHANGELOG: https://gitlab.com/marcosdalvarez/thinkpad-battery-threshold-extension/blob/main/CHANGELOG.md 
 */

'use strict';

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Indicator = Me.imports.libs.indicator;

var thresholdIndicator = null;

function init() {
    ExtensionUtils.initTranslations(Me.metadata.uuid);
}

function enable() {
    thresholdIndicator = new Indicator.ThresholdIndicator();
}

function disable() {
    thresholdIndicator.destroy();
    thresholdIndicator = null;
}
