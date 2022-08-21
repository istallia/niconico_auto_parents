/*
 * Copyright (C) 2020-2022 istallia
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
const niconico_urls = {
	sm : 'https://www.nicovideo.jp/watch/',
	im : 'https://seiga.nicovideo.jp/seiga/',
	nc : 'https://commons.nicovideo.jp/material/',
	td : 'https://3d.nicovideo.jp/works/',
	lv : 'https://live.nicovideo.jp/watch/',
	gm : 'https://game.nicovideo.jp/atsumaru/games/'
};


/* --- browserの読み込み --- */
if (typeof browser === 'undefined') browser = chrome;


/* --- [予約投稿] 予約内容を確認して送信する --- */
const reserveParents = () => {
	/* 情報を取得 */
	const info_date = document.getElementById('ista-form-reserving-date').value;
	const info_time = document.getElementById('ista-form-reserving-time').value;
	const info_ids  = document.getElementById('ista-form-reserving-ids').value;
	const id_count  = countIDs(info_ids);
	const video_id  = location.pathname.split('/')[2];
	const unixtime  = new Date(info_date + 'T' + info_time + ':30').getTime();
	if (id_count < 1 || info_date.length < 1 || info_time.length < 1) return;
	if (unixtime <= Date.now()) return;
	/* backgroundに送信する */
	localStorage.setItem('ista-reserved-list-'+video_id, info_ids);
	browser.runtime.sendMessage({
		request  : 'reserve-parents',
		id       : video_id,
		datetime : info_date + 'T' + info_time + ':30'
	}, res => {
		window.alert(String(id_count)+'件のIDからの登録を予約しました。');
	});
};


/* --- [予約投稿] IDリストをファイルから抽出する --- */
const extractIDsFromFiles = event => {
	/* ファイルからID抽出 */
	if (event.dataTransfer.files.length <= 0) return;
	event.preventDefault();
	document.getElementById('ista-form-reserving-ids').classList.remove('ista-hover');
	const extract_func = (name, event) => {
		const regexp       = /(?<=^|[^a-zA-Z0-9])((nc|im|sm|td)\d{2,12})(?=[^a-zA-Z0-9]|$)/g;
		const dropped_text = event.currentTarget.result.replace(/\x00/g, '');
		let ids_in_name  = [... name.matchAll(regexp)];
		let dropped_ids  = [... dropped_text.matchAll(regexp)];
		if (ids_in_name.length > 0) dropped_ids = ids_in_name;
		for (let index in dropped_ids) dropped_ids[index] = dropped_ids[index][1];
		let text_list = document.getElementById('ista-form-reserving-ids').value;
		if (text_list.slice(-1) !== '\n' && text_list.length > 0) text_list = text_list + '\n';
		text_list = text_list + optimizeList(dropped_ids.join(' '),false).join('\n');
		document.getElementById('ista-form-reserving-ids').value = text_list;
	}
	for (let file of event.dataTransfer.files) {
		const reader = new FileReader();
		reader.addEventListener('load', extract_func.bind(this, file.name));
		reader.readAsText(file);
	}
};


/* --- [予約投稿] エラーページに予約投稿用のフォームを追加 --- */
const addReservingParentsForm = () => {
	/* URLを確認 */
	if (location.pathname.slice(0,8) !== '/tree/sm') return;
	/* 親を取得 */
	let ul = document.querySelector('div.error-area ul > li > a[href="/cpp/"]');
	if (ul === null) return;
	ul = ul.parentNode.parentNode;
	/* フォームを追加 */
	const li             = document.createElement('li');
	const form_title     = document.createElement('div');
	const form_desc      = document.createElement('div');
	const input_date     = document.createElement('input');
	const input_time     = document.createElement('input');
	const input_ids      = document.createElement('textarea');
	const button_reserve = document.createElement('a');
	const video_id       = location.pathname.split('/')[2];
	const current_ids    = localStorage.getItem('ista-reserved-list-'+video_id) || '';
	li.classList.add('ista-form-reserving');
	form_title.classList.add('ista-form-reserving-title');
	button_reserve.classList.add('btn-02');
	input_date.id            = 'ista-form-reserving-date';
	input_time.id            = 'ista-form-reserving-time';
	input_ids.id             = 'ista-form-reserving-ids';
	form_title.innerText     = '[拡張機能] ツリー登録予約';
	form_desc.innerText      = '設定した時刻に自動でタブを開き、IDリストを流し込みます。\n※指定時刻にPCを起動しておく必要があります。';
	input_date.type          = 'date';
	input_time.type          = 'time';
	input_ids.placeholder    = 'ここにIDリストを入力\nファイルをD&DするとIDを抽出します(複数ファイル可)';
	input_ids.value          = current_ids;
	button_reserve.innerText = '[拡張機能] ツリー登録予約';
	button_reserve.href      = 'javascript:void(0)';
	input_ids.addEventListener('dragover' , event => event.currentTarget.classList.add('ista-hover')   );
	input_ids.addEventListener('dragleave', event => event.currentTarget.classList.remove('ista-hover'));
	input_ids.addEventListener('drop'     , extractIDsFromFiles);
	button_reserve.addEventListener('click', reserveParents);
	li.appendChild(form_title);
	li.appendChild(form_desc);
	li.appendChild(input_date);
	li.appendChild(input_time);
	li.appendChild(input_ids);
	li.appendChild(button_reserve);
	ul.appendChild(li);
};
addReservingParentsForm();


/* --- [予約投稿] サーバ側でエラーが出たときは再予約する --- */
const rereserveParents = () => {
	/* 作品IDを取得 */
	const work_id = document.referrer.split('?').shift().split('#').shift().split('/').pop();
	const id_list = sessionStorage('ista-reserved-list-'+work_id);
	/* 次の予約時刻を計算 */
	let current_time        = new Date(Date.now() + 9*60*60*1000 + 20*60*1000);
	let next_reserving_time = current_time.toISOString().slice(0,19);
	/* backgroundに送信する */
	localStorage.setItem('ista-reserved-list-'+work_id, id_list);
	browser.runtime.sendMessage({
		request  : 'reserve-parents',
		id       : work_id,
		datetime : next_reserving_time
	}, res => {
		window.alert('エラーにより登録を完了できなかったため、ツリー登録を20分後に再予約しました。\nすぐに登録を行う場合はブラウザバックしてください。');
	});
}
if (location.pathname === '/tree/update') rereserveParents();


/* --- [予約投稿] tree-editで生成したUIを操作してIDを流し込む --- */
const registReservedParents = () => {
	/* URLを確認 */
	if (location.pathname.slice(0,13) !== '/tree/edit/sm') return;
	const get_params = analyzeGetParam(location.search);
	if (get_params['ista-reserved-tree'] !== 'true') return;
	const video_id = location.pathname.split('/')[3];
	const id_list  = localStorage.getItem('ista-reserved-list-'+video_id);
	if (countIDs(id_list) < 1) return;
	/* モーダルを出す */
	const button_open = document.getElementById('ista-open-modal');
	const textarea    = document.getElementById('ista-textarea-id-list');
	if (!button_open || !textarea) {
		setTimeout(registReservedParents, 500);
		return;
	}
	button_open.dispatchEvent(new Event('click', {bubbles: true, composed: true}));
	textarea.value = id_list;
	/* 適当なタイミングで流し込む */
	setTimeout(() => {
		document.getElementById('ista-button-auto-regist').dispatchEvent(new Event('click', {bubbles: true, composed: true}));
		const target   = document.getElementById('ista-auto-modal-bg');
		const observer = new MutationObserver(records => {
			if (document.getElementById('ista-auto-modal-bg').style.display === 'none') {
				sessionStorage.setItem('ista-reserved-list-'+video_id, id_list);
				localStorage.removeItem('ista-reserved-list-'+video_id);
				document.getElementById('send_check').dispatchEvent(new Event('click', {bubbles: true, composed: true}));
			}
		});
		observer.observe(target, {attributes:true});
	}, 500);
};
setTimeout(registReservedParents, 500);


/* --- [リンク置換] リンクを置き換える処理 (監視して繰り返し処理) --- */
const replaceCommonsLinks = () => {
	/* 親要素を監視 */
	const parent_el = document.querySelector('section.p-contentsTreeViewPage, section.p-treeParentsPage');
	if (parent_el) {
		if (parent_el.classList.contains('ista-link-replacing')) {
			setTimeout(replaceCommonsLinks, 100);
		} else {
			const observer = new MutationObserver(replaceCommonsLinks);
			observer.observe(parent_el, {childList:true, subtree:true});
			parent_el.classList.add('ista-link-replacing');
		}
	}
	/* 有効/無効確認 */
	browser.storage.local.get({
		replacing_commons_links : false
	}, option_items => {
		/* 無効なら帰る */
		if (!option_items['replacing_commons_links']) return;
		/* リンクを探して置換 */
		const commons_links = document.querySelectorAll('a.parentsCardPreview:not(.ista-link-replaced), a.childrenCardPreview:not(.ista-link-replaced)');
		[... commons_links].forEach(a => {
			const url  = new URL(a.href);
			const dirs = url.pathname.split('/');
			const id   = dirs[dirs.length-1];
			if (id.slice(0, 2) in niconico_urls) {
				a.href = niconico_urls[id.slice(0, 2)] + id;
				a.classList.add('ista-link-replaced');
			}
		});
	});
};
replaceCommonsLinks();


/* --- IDリストに含まれるIDをカウントする --- */
let countIDs = id_list => {
	/* リストを取得 */
	let p_list = id_list.split('\n');
	for (i in p_list) p_list[i] = p_list[i].split(' ');
	p_list = p_list.flat();
	/* IDの形式であり、かつ重複のないリストを作成する */
	let ok_list = [];
	for (i in p_list) {
		if( /^[a-zA-Z]{1,3}\d{1,12}$/.test(p_list[i]) && ok_list.indexOf(p_list[i]) < 0 ) {
			ok_list.push(p_list[i]);
		}
	}
	return ok_list.length;
};


/* --- GETパラメータを解析 --- */
const analyzeGetParam = query => {
	if (query.slice(0,1) === '?') query = query.slice(1);
	let params = query.split('&');
	let result = {};
	params = params.map(param => param.split('='));
	params.forEach(param => result[param[0]] = decodeURI(param[1]));
	return result;
};
