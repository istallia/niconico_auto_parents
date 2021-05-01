/*
 * ツリー一覧ページに作用するJavaScript
 * 予約投稿対応などに使う
 */


/* --- browserの読み込み --- */
if (typeof browser === 'undefined') browser = chrome;


/* --- [予約投稿] エラーページに予約投稿用のフォームを追加 --- */
const addReservingParentsForm = () => {
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
	li.classList.add('ista-form-reserving');
	form_title.classList.add('ista-form-reserving-title');
	button_reserve.classList.add('btn-02');
	form_title.innerText     = '[拡張機能] ツリー登録予約';
	form_desc.innerText      = '設定した時刻に自動でタブを開き、IDリストを流し込みます。\n※指定時刻にPCを起動しておく必要があります。';
	input_date.type          = 'date';
	input_time.type          = 'time';
	input_ids.placeholder    = 'ここにIDリストを入力';
	button_reserve.innerText = '[拡張機能] ツリー登録予約';
	button_reserve.href      = 'javascript:void(0)';
	li.appendChild(form_title);
	li.appendChild(form_desc);
	li.appendChild(input_date);
	li.appendChild(input_time);
	li.appendChild(input_ids);
	li.appendChild(button_reserve);
	ul.appendChild(li);
};
addReservingParentsForm();


/* --- GETパラメータを解析 --- */
const analyzeGetParam = url => {
	/* まずは"?"以降を切り取り */
	const q_pos = url.indexOf('?');
	if (q_pos < 0) return {};
	const query = url.slice(q_pos+1)
	/* 分割してパラメータ取得 */
	let params = query.split('&');
	let result = {};
	params = params.map(param => param.split('='));
	params.forEach(param => result[param[0]] = decodeURI(param[1]));
	return result;
};
