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

/*
 * ツリー一覧ページに作用するJavaScript
 * 予約投稿対応などに使う
 */


/* --- [リンク置換] 各サービスのURL --- */
const tree_url = 'https://commons.nicovideo.jp/tree/';
const niconico_urls = {
	sm : 'https://www.nicovideo.jp/watch/',
	im : 'https://seiga.nicovideo.jp/seiga/',
	nc : 'https://commons.nicovideo.jp/works/',
	td : 'https://3d.nicovideo.jp/works/',
	lv : 'https://live.nicovideo.jp/watch/',
	gm : 'https://game.nicovideo.jp/atsumaru/games/'
};


/* --- browserの読み込み --- */
if (typeof browser === 'undefined') browser = chrome;


/* --- [リンク置換] リンクを置き換える処理 (監視して繰り返し処理) --- */
const replaceCommonsLinks = () => {
	/* 有効/無効確認 */
	browser.storage.local.get({
		replacing_commons_links : false
	}, option_items => {
		/* 無効なら帰る */
		console.log('オプション取得: ' + option_items['replacing_commons_links']);
		if (!option_items['replacing_commons_links']) return;
		/* 親要素を監視 */
		const parent_el = document.querySelector('div.p-works, section.p-treeParentsPage');
		if (parent_el) {
			if (parent_el.classList.contains('ista-link-replacing')) {
				// setTimeout(replaceCommonsLinks, 100);
			} else {
				const observer = new MutationObserver(replaceCommonsLinks);
				observer.observe(parent_el, {childList:true, subtree:true});
				parent_el.classList.add('ista-link-replacing');
			}
		}
		/* リンクを探して置換 */
		const commons_links = document.querySelectorAll('a.carouselCardPreview:not(.ista-link-replaced), a.childrenCardPreview:not(.ista-link-replaced)');
		console.log(commons_links);
		[... commons_links].forEach(a_view => {
			/* ツリー閲覧ページへのリンクは作品ページへのリンクに置換 */
			const url  = new URL(a_view.href);
			const dirs = url.pathname.split('/');
			const id   = dirs[dirs.length-1];
			if (id.slice(0, 2) in niconico_urls) {
				a_view.href = niconico_urls[id.slice(0, 2)] + id;
				a_view.classList.add('ista-link-replaced');
			}
			/* 作品ページへのリンクはツリー閲覧ページへのリンクに置換 */
			const as_work = a_view.parentNode.querySelectorAll('a:not([class])');
			[... as_work].filter(a_work => !a_work.getAttribute('href').startsWith('javascript')).forEach(a_work => {
				if (a_work.innerText.length > 0 && a_work.innerText.indexOf('ブロック') < 0) {
					a_work.href = tree_url + id;
					a_work.classList.add('ista-link-replaced');
					a_work.innerText = 'ツリーを見る';
				}
			});
		});
	});
};
replaceCommonsLinks();


/* --- GETパラメータを解析 --- */
// const analyzeGetParam = query => {
// 	if (query.slice(0,1) === '?') query = query.slice(1);
// 	let params = query.split('&');
// 	let result = {};
// 	params = params.map(param => param.split('='));
// 	params.forEach(param => result[param[0]] = decodeURI(param[1]));
// 	return result;
// };
