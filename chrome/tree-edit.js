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
 * ページに作用するJavaScript
 * ボタンやモーダルウィンドウの追加、および動作の記述を行う
 */


/* --- browserの読み込み --- */
if (typeof browser === 'undefined') browser = chrome;


/* --- 状態を保存する --- */
const MAX_WORKS          = 300;
let ista_processing      = false;
const alert_alt          = window.alert;
window.alert             = text => console.log('alert -> '+text);
let ista_linked_ids      = {};
let nico_expansion_ready = false;


/* --- ページに要素を追加する --- */
/* 「IDリストから自動登録」ボタンの追加 */
const button_open = document.createElement('a');
button_open.id    = 'ista-open-modal';
button_open.classList.add('btn-01');
button_open.innerText    = '[拡張機能]IDリストから自動登録';
button_open.style.cursor = 'pointer';
button_open.addEventListener('click', () => {
	document.getElementById('ista-auto-modal').style.display    = 'block';
	document.getElementById('ista-auto-modal-bg').style.display = 'block';
	document.getElementById('ista-auto-modal').ondragover = event => {
		event.preventDefault();
		document.getElementById('ista-textarea-id-list').classList.add('ista-dragover');
	};
	document.getElementById('ista-auto-modal').ondragleave = event => {
		document.getElementById('ista-textarea-id-list').classList.remove('ista-dragover');
	};
	document.getElementById('ista-auto-modal').ondrop = event => {
		/* ファイルからID抽出 */
		document.getElementById('ista-textarea-id-list').classList.remove('ista-dragover');
		if (event.dataTransfer.files.length <= 0) return;
		event.preventDefault();
		const extract_func = (name, event) => {
			const regexp       = /(?<=^|[^a-zA-Z0-9])((nc|im|sm|td)\d{2,12})(?=[^a-zA-Z0-9]|$)/g;
			const dropped_text = event.currentTarget.result.replace(/\x00/g, '');
			let ids_in_name  = [... name.matchAll(regexp)];
			let dropped_ids  = [... dropped_text.matchAll(regexp)];
			if (ids_in_name.length > 0) dropped_ids = ids_in_name;
			for (let index in dropped_ids) dropped_ids[index] = dropped_ids[index][1];
			let text_list = document.getElementById('ista-textarea-id-list').value;
			if (text_list.slice(-1) !== '\n' && text_list.length > 0) text_list = text_list + '\n';
			text_list = text_list + optimizeList(dropped_ids.join(' '),false).join('\n');
			document.getElementById('ista-textarea-id-list').value = text_list;
		}
		for (let file of event.dataTransfer.files) {
			const reader = new FileReader();
			reader.addEventListener('load', extract_func.bind(this, file.name));
			reader.readAsText(file);
		}
	};
	document.getElementById('ista-button-auto-regist').onclick = addMaterialsByIdList;
	let select           = document.getElementById('site_selector');
	select.selectedIndex = select.options.length - 1;
	select.dispatchEvent(new Event('change', {bubbles: true, composed: true}));
	/* チェックボックスに値を反映する */
	document.getElementById('ista-verify-contents').checked = (localStorage.getItem('ista-verify-contents') !== 'false');
});
const parent_button = document.getElementsByClassName('submit')[0];
parent_button.insertBefore(button_open, parent_button.firstChild);
/* モーダルウィンドウの追加 */
const modal_win = document.createElement('div');
modal_win.id = 'ista-auto-modal';
modal_win.classList.add('ista-auto-modal');
modal_win.innerHTML = `
<p>
	使用した素材のIDのリスト(登録できるのは最大300件)を入力してください。ファイル(複数可)を枠内にD&Dすると、そのファイルの中身または名前に含まれる作品ID(動画/静画/コモンズ/立体)を抽出できます。<br>
	各機能のボタンはカーソルを合わせると簡単な説明を見ることができます。
</p>
<button type="button" id="ista-read-parent-works" class="ista-button white" title="(v0.4.1) 親作品の欄にある作品を読み出します。">親作品を読み出し</button>&nbsp;
<button type="button" id="ista-open-sidebar-bookmarks" class="ista-button white" title="(v0.4.2) ブラウザのブックマークから作品IDを選択して追加します。">ニコニコ・ブックマーク</button>&nbsp;
<button type="button" id="ista-open-sidebar-exlists" class="ista-button white" title="(v0.5.6) nicoExpansion(ニコニコ拡張)の拡張マイリストから作品IDを選択して追加します。">拡張マイリスト</button>&nbsp;
<button type="button" id="ista-get-parents-of-parents" class="ista-button white" title="(v0.5.3) 選択範囲の作品の親作品を取得します。">ツリー・チェイン</button><br>
<label for="ista-verify-contents" title="(v0.3.2) これがOnのとき、親作品に登録できなかった作品を自動で確認してお知らせします。"><input type="checkbox" id="ista-verify-contents" checked>&nbsp;書き込み検証を行う</label>
<textarea id="ista-textarea-id-list"></textarea>
<button id="ista-button-auto-regist" class="ista-button">自動登録</button>
`;
parent_button.parentNode.insertBefore(modal_win, parent_button);
/* モーダル背景の追加 */
const modal_win_bg = document.createElement('div');
modal_win_bg.id  = 'ista-auto-modal-bg';
modal_win_bg.classList.add('ista-auto-modal-bg');
parent_button.parentNode.insertBefore(modal_win_bg, parent_button);
modal_win_bg.addEventListener('click', () => {
	if( !ista_processing ) {
		document.getElementById('ista-auto-modal').style.display    = 'none';
		document.getElementById('ista-auto-modal-bg').style.display = 'none';
		closeSidebar();
	}
});
/* 「一括登録」ボタンの追加 */
const button_regist_candidates = document.createElement('button');
button_regist_candidates.classList.add('ista-button-reg');
button_regist_candidates.innerText = '[拡張機能]一括登録';
button_regist_candidates.title     = 'このボタンをクリックすると候補作品を一括で親作品欄に移動することができます。';
document.querySelector("#Column01 > div.tree-edit-area.editbox.round5-t > p.helpimg img").title = '[拡張機能] (v0.3.4)この矢印をクリックすると候補作品を一括で親作品欄に移動することができます。';
const parent_h3 = document.querySelector('div.search-parent h3');
parent_h3.appendChild(button_regist_candidates);
/* コンテンツツリーの連携がある場合のお知らせメッセージ */
const p_submit           = document.querySelector('p.submit');
const notice_message     = document.createElement('p');
notice_message.innerText = '[拡張機能] 1つ以上のコモンズ作品にコンテンツツリーの連携が設定されていたため、登録先を切り替えました。';
notice_message.hidden    = true;
p_submit.insertBefore(notice_message, p_submit.firstChild);


/* --- [nicoExpansion] インストール確認 --- */
browser.runtime.sendMessage({request:'get-exlists'}, response => nico_expansion_ready = Boolean(response));


/* --- IDリストを最高効率に変換する --- */
const optimizeList = (id_list, check_parents = true) => {
	/* IDを1つずつバラバラの配列にする */
	let p_list = [... id_list.matchAll(/\b[a-zA-Z]{2}\d{1,12}\b/g)];
	p_list = p_list.map(res => res[0]);
	/* 既に登録済みのリストを取得する */
	const parent_works_ul = document.getElementById('parents');
	let ng_list = [];
	if (parent_works_ul && check_parents) {
		let items   = [... parent_works_ul.children];
		for (let item of items) ng_list.push(item.id);
	}
	/* IDの形式であり、かつ重複のないリストを作成する */
	let ok_list = [];
	for (i in p_list) {
		if( ok_list.indexOf(p_list[i]) < 0 && ng_list.indexOf(p_list[i]) < 0 ) {
			ok_list.push(p_list[i]);
		}
	}
	/* 10件ごとのリストに変換する */
	let res_list = [];
	for (i in ok_list) {
		i = Number(i);
		if( i % 10 === 0 ) res_list.push('');
		res_list[Math.floor(i/10)] += ok_list[i];
		if( i % 10 < 9 ) {
			res_list[Math.floor(i/10)] += ' ';
		} else {
			res_list[Math.floor(i/10)] += '\n';
		}
	}
	for (i in res_list) {
		res_list[i] = res_list[i].slice(0, -1);
	}
	return res_list;
};


/* --- 入力→候補に追加→要素の移動 を行うPromiseを返す --- */
const createPromiseCandidates = id10 => {
	return new Promise(resolve => {
		/* 入力 */
		return new Promise(() => {
			// console.log(id10);
			document.getElementById('candidate_input').value = id10;
			resolve();
		});
	})
	.then(() => {
		/* 候補に追加 */
		return new Promise(resolve => {
			let button = document.querySelector('a[title="候補に追加する"]');
			button.dispatchEvent(new Event('click', {bubbles: true, composed: true}));
			// console.log('[拡張機能]候補に追加');
			setTimeout(() => {
				document.getElementById('candidate_input').value = '';
			}, 200);
			resolve();
		});
	})
	.then(() => {
		/* 要素の移動 */
		return new Promise(resolve => {
			let add_candidates = count => {
				/* 各要素の取得 */
				let candidates   = document.getElementById('candidate');
				let parent_works = document.getElementById('parents');
				let items        = [... candidates.children];
				let p_items      = [... parent_works.children];
				/* 親作登録上限の確認 */
				if( items.length + p_items.length > MAX_WORKS ) {
					alert_alt('合計親作品数が300件を超えるため、候補を自動登録することができません。');
					document.getElementById('ista-auto-modal').style.display    = 'none';
					document.getElementById('ista-auto-modal-bg').style.display = 'none';
					document.getElementById('ista-textarea-id-list').value      = '';
					document.getElementById('checkbox').style.display           = 'none';
					document.getElementById('parents').style.backgroundImage    = 'url("")';
					ista_processing = false;
					closeSidebar();
					throw new Error('limit-300');
					return;
				}
				/* 要素がなければもう一度予約 */
				if( items.length < 1 && count < 25 ) {
					setTimeout(add_candidates.bind(this, count+1), 200);
					return;
				}
				/* 親作品欄との重複がないか確認 */
				const p_items_id = p_items.map(li => li.id);
				items            = items.filter(li => {
					checkLinkedCommons(li);
					return p_items_id.indexOf(li.id) === -1;
				});
				/* 要素を親作品欄に追加 */
				items.forEach(item => {
					parent_works.appendChild(item);
				});
				// console.log('[拡張機能]要素の移動');
				resolve();
			};
			setTimeout(add_candidates.bind(this, 0), 300);
		});
	});
};


/* --- IDリストを読み取り、すべてのIDを追加する --- */
const addMaterialsByIdList = () => {
	ista_processing  = true;
	let id_list      = document.getElementById('ista-textarea-id-list').value;
	id_list          = optimizeList(id_list);
	document.getElementById('ista-textarea-id-list').value = id_list.join('\n');
	localStorage.setItem('ista-verify-contents', String(document.getElementById('ista-verify-contents').checked));
	if (id_list.length > 0) {
		document.getElementById('checkbox').style.display        = 'none';
		document.getElementById('parents').style.backgroundImage = 'url("")';
	}
	// let promise_list = [];
	let a_promise = Promise.resolve();
	for (const list of id_list) {
		// promise_list.push(createPromiseCandidates.bind(this, list));
		if( list.length > 2 ) a_promise = a_promise.then(createPromiseCandidates.bind(this, list));
	}
	// let a_promise = promise_list.reduce((promise, task) => (
	// 	promise.then(task)
	// ), Promise.resolve());
	a_promise.finally(() => {
		let text_list = document.getElementById('ista-textarea-id-list').value;
		for (let source_id in ista_linked_ids) {
			let dest_id = ista_linked_ids[source_id];
			text_list = text_list.replace(source_id, dest_id);
		}
		let remained_list = optimizeList(text_list).join('\n');
		let verify        = (localStorage.getItem('ista-verify-contents') !== 'false');
		if ( remained_list.length > 2 && verify ) {
			/* IDが残留した場合 */
			alert_alt('[コンテンツツリー登録支援ツール]\nいくつかのIDの作品が正常に登録されませんでした。\n繰り返し登録しようとしても失敗する場合は、当該作品が非公開または削除された可能性があります。');
			document.getElementById('ista-textarea-id-list').value = remained_list;
			ista_processing = false;
		} else {
			/* すべてのIDが正常に登録された場合 */
			document.getElementById('ista-auto-modal').style.display    = 'none';
			document.getElementById('ista-auto-modal-bg').style.display = 'none';
			document.getElementById('ista-textarea-id-list').value      = '';
			ista_processing = false;
			closeSidebar();
		}
	});
};


/* --- 現在の候補から一括登録を行う --- */
const autoRegistCandidates = () => {
	/* 各種要素を取得 */
	let candidates   = document.getElementById('candidate');
	let parent_works = document.getElementById('parents');
	let items        = [... candidates.children];
	let p_items      = [... document.getElementById('parents').children];
	/* 親作品欄の件数を確認 */
	if( items.length + p_items.length > MAX_WORKS ) {
		alert_alt('合計親作品数が300件を超えるため、候補を一括登録することができません。');
		return;
	}
	/* 重複チェック＆追加 */
	items.forEach(item => {
		checkLinkedCommons(item);
		for(p_item of p_items) {
			if(p_item.id === item.id) return;
		}
		parent_works.appendChild(item);
	});
	if ( p_items.length === 0 && items.length > 0 ) {
		document.getElementById('checkbox').style.display           = 'none';
		document.getElementById('parents').style.backgroundImage    = 'url("")';
	}
};
button_regist_candidates.addEventListener('click', autoRegistCandidates);
document.querySelector("#Column01 > div.tree-edit-area.editbox.round5-t > p.helpimg").addEventListener('click', autoRegistCandidates);


/* --- 候補作品をクリックで移動させるためのイベント --- */
const clickToMoveCandidate = event => {
	/* 親をチェック */
	const parent = event.currentTarget.parentNode;
	if( parent.id !== 'candidate' ) return;
	/* 親作品の件数チェック */
	let p_items = [... document.getElementById('parents').children];
	if( p_items.length + 1 > MAX_WORKS ) {
		alert_alt('300件を超える親作品を登録することはできません。');
		return;
	}
	/* 親作品欄との重複がないか確認 */
	const p_items_id = p_items.map(li => li.id);
	checkLinkedCommons(event.currentTarget);
	if (p_items_id.indexOf(event.currentTarget.id) > -1) return;
	/* 移動する */
	const parent_works = document.getElementById('parents');
	parent_works.appendChild(event.currentTarget);
	if ( p_items.length === 0 ) {
		document.getElementById('checkbox').style.display           = 'none';
		document.getElementById('parents').style.backgroundImage    = 'url("")';
	}
};
let observer_candidates = () => {
	let parent_items = [... document.getElementById('candidate').children];
	parent_items.forEach(item => {
		if( item.getAttribute('ev') !== 'yes' ) {
			item.addEventListener('click', clickToMoveCandidate);
			item.setAttribute('ev', 'yes');
		}
	});
};
setInterval(observer_candidates, 200);


/* --- [ツリー・チェイン] ボタンが押されたらチェイン開始 --- */
button_open.addEventListener('click', () => {
	document.getElementById('ista-get-parents-of-parents').addEventListener('click', event => {
		/* イベント無効 */
		event.preventDefault();
		/* 選択範囲のID取得 */
		const selection = window.getSelection();
		let id_text     = '';
		if (selection.toString().length > 0) {
			id_text = selection.toString();
		} else {
			const textarea = document.getElementById('ista-textarea-id-list');
			const s_start  = textarea.selectionStart;
			const s_end    = textarea.selectionEnd;
			id_text        = textarea.value.substring(s_start, s_end);
		}
		let id_list = optimizeList(id_text, false).join(' ').split(' ');
		if (id_list.length < 1 || id_list[0].length < 3) return;
		/* すべてのIDに対して親作品取得を実行 */
		id_list.forEach(getParentsOfParents);
	});
});


/* --- [ツリー・チェイン] 親作品の親作品を取得 --- */
const getParentsOfParents = id => {
	/* パラメータを準備 */
	const params = new URLSearchParams({
		_offset   : 0,
		_limit    : 300,
		with_meta : 0,
		_sort     : '-id'
	});
	/* 送信 */
	fetch('https://public-api.commons.nicovideo.jp/v1/tree/'+id+'/relatives/parents?'+params.toString(), {
		mode        : 'cors',
		credentials : 'include',
		cache       : 'no-cache'
	})
	.catch(err => {
		window.alert('サーバーに接続できませんでした。インターネット接続を確認してください。');
		console.log(err);
		return null;
	})
	.then(response => response.json())
	.then(json => {
		/* IDリストの文字列を取得 */
		let id_list = json.data.parents.contents.map(work => work.globalId);
		let id_text = '';
		id_list.forEach((id, i) => {
			if (i % 10 < 9) {
				id_text += id + ' '
			} else {
				id_text += id + '\n'
			}
		});
		/* IDリストを入力欄の末尾に追加 */
		const textarea   = document.getElementById('ista-textarea-id-list');
		let current_text = textarea.value;
		if (current_text.slice(-1) !== '\n') current_text += '\n';
		textarea.value = current_text + id_text;
	});
};


/* --- [サイドバー] サイドバーを準備する --- */
button_open.addEventListener('click', () => {
	generateSidebar(ids => {
		const current_area = document.getElementById('ista-textarea-id-list');
		if (current_area.value.length > 0 && current_area.value.slice(-1) !== '\n') current_area.value += '\n';
		current_area.value += ids.join(' ');
	});
	document.getElementById('ista-open-sidebar-bookmarks').addEventListener('click', openSidebarBookmarks);
	if (nico_expansion_ready) {
		document.getElementById('ista-open-sidebar-exlists').addEventListener('click', openSidebarExLists);
	} else {
		document.getElementById('ista-open-sidebar-exlists').classList.add('hidden');
	}
});


/* --- [ニコニコ・ブックマーク] サイドバーを開く --- */
const openSidebarBookmarks = () => {
	/* ブックマーク内の作品一覧を取得 */
	browser.runtime.sendMessage({request:'get-bookmarks'}, response => {
		const current_text = document.getElementById('ista-textarea-id-list');
		openSidebar('ニコニコ・ブックマーク', () => {
			return [... current_text.value.matchAll(/\b[a-zA-Z]{2}\d{1,12}\b/g)].map(id => id[0]);
		}, response, id => {
			const area_list  = document.getElementById('ista-textarea-id-list');
			let current_text = area_list.value;
			if (current_text.length > 0 && current_text.slice(-1) !== ' ' && current_text.slice(-1) !== '\n') current_text += ' ';
			area_list.value = current_text + id;
		});
	});
};


/* --- [nicoExpansion] サイドバーを開く --- */
const openSidebarExLists = () => {
	/* 拡張マイリストを取得 */
	browser.runtime.sendMessage({request:'get-exlists'}, response => {
		const current_text = document.getElementById('ista-textarea-id-list');
		openSidebar('拡張マイリスト', () => {
			return [... current_text.value.matchAll(/\b[a-zA-Z]{2}\d{1,12}\b/g)].map(id => id[0]);
		}, response, id => {
			const area_list  = document.getElementById('ista-textarea-id-list');
			let current_text = area_list.value;
			if (current_text.length > 0 && current_text.slice(-1) !== ' ' && current_text.slice(-1) !== '\n') current_text += ' ';
			area_list.value = current_text + id;
		});
	});
};


/* --- [読み出し] 読み出す --- */
const readParentWorks = () => {
	/* 要素のリストを読み出す */
	const element_parents_area = document.getElementById('parents');
	const element_parents_list = [... element_parents_area.children];
	/* テキスト化 */
	let materials_list = [];
	// element_parents_list.forEach(work => {
	// 	const work_id    = work.id;
	// 	const work_title = work.querySelector('div.item1 > div.dsc').innerText;
	// 	materials_list   = work_id + ' ' + work_title + '\n';
	// });
	for (let work of element_parents_list) {
		const work_id    = work.id;
		const work_title = work.querySelector('div.item1 > div.dsc').innerText;
		materials_list.push(work_id + ' -> ' + work_title);
	}
	materials_list = materials_list.join('\n');
	if (!window.confirm('タイトル付きの形式で読み出しますか？')) {
		materials_list = optimizeList(materials_list, false).join('\n');
	}
	document.getElementById('ista-textarea-id-list').value = materials_list;
};
button_open.addEventListener('click', () => {
	document.getElementById('ista-read-parent-works').addEventListener('click', readParentWorks);
});


/* --- 連携付きコモンズ作品を連携先の表示に変更 --- */
const checkLinkedCommons = (element, do_replace = true) => {
	/* 連携が付いているかチェック */
	const main_creation   = element.querySelector('div.main-creation');
	const linked_creation = element.querySelector('div.linked-creation');
	if (!linked_creation) return null;
	/* IDを置き換え */
	const source_id            = element.id;
	const dest_id              = main_creation.querySelector('div.linked-creation-data').getAttribute('data-linked-creation-id');
	ista_linked_ids[source_id] = dest_id;
	if (do_replace) {
		element.id = dest_id;
		/* 表示を切り替え */
		main_creation.hidden   = true;
		linked_creation.hidden = false;
		notice_message.hidden  = false;
	}
	return dest_id;
};
