/*
 * ツリー一覧ページに作用するJavaScript
 * 予約投稿対応などに使う
 */


/* --- browserの読み込み --- */
if (typeof browser === 'undefined') browser = chrome;


/* --- [予約投稿] 予約内容を確認して送信する --- */
const reserveParents = () => {
	/* 情報を取得 */
	const info_date = document.getElementById('ista-form-reserving-date').value;
	const info_time = document.getElementById('ista-form-reserving-time').value;
	const info_ids  = document.getElementById('ista-form-reserving-ids').value;
	const id_count  = countIDs(info_ids);
	if (id_count < 1) return;
	/* backgroundに送信する */
	browser.runtime.sendMessage({
		request  : 'reserve-parents',
		datetime : info_date + 'T' + info_time + ':30',
		list     : info_ids
	}, res => {
		window.alert(String(id_count)+'件のIDからの登録を予約しました。');
	});
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
	input_ids.placeholder    = 'ここにIDリストを入力';
	button_reserve.innerText = '[拡張機能] ツリー登録予約';
	button_reserve.href      = 'javascript:void(0)';
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


/* --- IDリストに含まれるIDをカウントする --- */
let countIDs = id_list => {
	let p_list = id_list.split('\n');
	for (i in p_list) p_list[i] = p_list[i].split(' ');
	p_list = p_list.flat();
	return p_list.length;
};


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
