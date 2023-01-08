/*
 * Copyright (C) 2020-2023 istallia
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

if (typeof browser === 'undefined') browser = chrome;


/* --- 設定項目をセットアップ --- */
document.addEventListener('DOMContentLoaded', () => {
  /* 要素を取得 */
  const bool_replacing_commons_links = document.getElementById('bool-replacing-commons-links');
  /* 設定を反映 */
  browser.storage.local.get({
    replacing_commons_links : false
  }, option_items => {
    bool_replacing_commons_links.checked = option_items['replacing_commons_links'];
  });
  /* 設定が変更された際の反映処理 */
  bool_replacing_commons_links.addEventListener('change', event => {
    browser.storage.local.set({
      replacing_commons_links : event.currentTarget.checked
    });
  });
});
