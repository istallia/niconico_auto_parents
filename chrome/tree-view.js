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
	const video_id  = location.pathname.split('/')[2];
	if (id_count < 1 || info_date.length < 1 || info_time.length < 1) return;
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
	const textarea    = document.getElementById('ista-auto-list');
	if (!button_open || !textarea) {
		setTimeout(registReservedParents, 500);
		return;
	}
	button_open.dispatchEvent(new Event('click', {bubbles: true, composed: true}));
	textarea.value = id_list;
	/* 適当なタイミングで流し込む */
	setTimeout(() => {
		document.getElementById('ista-auto-button').dispatchEvent(new Event('click', {bubbles: true, composed: true}));
		const target   = document.getElementById('ista-auto-modal-bg');
		const observer = new MutationObserver(records => {
			if (document.getElementById('ista-auto-modal-bg').style.display === 'none') {
				localStorage.removeItem('ista-reserved-list-'+video_id);
				document.getElementById('send_check').dispatchEvent(new Event('click', {bubbles: true, composed: true}));
			}
		});
		observer.observe(target, {attributes:true});
	}, 500);
};
setTimeout(registReservedParents, 500);


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
	return p_list.length;
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
