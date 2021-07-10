/*
 * ページに作用するJavaScript
 * ボタンやモーダルウィンドウの追加、および動作の記述を行う
 */


/* --- browserの読み込み --- */
if (typeof browser === 'undefined') browser = chrome;


/* --- 状態を保存する --- */
const MAX_WORKS     = 300;
let ista_processing = false;
const alert_alt     = window.alert;
window.alert        = text => console.log('alert -> '+text);
let ista_linked_ids = {};


/* --- IDリストを最高効率に変換する --- */
let optimize_list = (id_list, check_parents = true) => {
	/* IDを1つずつバラバラの配列にする */
	let p_list = id_list.split('\n');
	for (i in p_list) p_list[i] = p_list[i].split(' ');
	p_list = p_list.flat();
	/* 既に登録済みのリストを取得する */
	let ng_list = [];
	let items   = [... document.getElementById('parents').children];
	if (!check_parents) items = [];
	for (item of items) ng_list.push(item.id);
	/* IDの形式であり、かつ重複のないリストを作成する */
	let ok_list = [];
	for (i in p_list) {
		if( /^[a-zA-Z]{1,3}\d{1,12}$/.test(p_list[i]) && ok_list.indexOf(p_list[i]) < 0 && ng_list.indexOf(p_list[i]) < 0 ) {
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
let create_promise_candidates = id10 => {
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
					document.getElementById('ista-auto-list').value             = '';
					document.getElementById('checkbox').style.display           = 'none';
					document.getElementById('parents').style.backgroundImage    = 'url("")';
					ista_processing                                             = false;
					document.getElementById('ista-sidebar-bookmarks').classList.remove('visible');
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
					check_linked_commons(li);
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
let add_materials = () => {
	ista_processing  = true;
	let id_list      = document.getElementById('ista-auto-list').value;
	id_list          = optimize_list(id_list);
	document.getElementById('ista-auto-list').value = id_list.join('\n');
	localStorage.setItem('ista-verify-contents', String(document.getElementById('ista-verify-contents').checked));
	if (id_list.length > 0) {
		document.getElementById('checkbox').style.display        = 'none';
		document.getElementById('parents').style.backgroundImage = 'url("")';
	}
	// let promise_list = [];
	let a_promise = Promise.resolve();
	for (const list of id_list) {
		// promise_list.push(create_promise_candidates.bind(this, list));
		if( list.length > 2 ) a_promise = a_promise.then(create_promise_candidates.bind(this, list));
	}
	// let a_promise = promise_list.reduce((promise, task) => (
	// 	promise.then(task)
	// ), Promise.resolve());
	a_promise.finally(() => {
		let text_list = document.getElementById('ista-auto-list').value;
		for (let source_id in ista_linked_ids) {
			let dest_id = ista_linked_ids[source_id];
			text_list = text_list.replace(source_id, dest_id);
		}
		let remained_list = optimize_list(text_list).join('\n');
		let verify        = (localStorage.getItem('ista-verify-contents') !== 'false');
		if ( remained_list.length > 2 && verify ) {
			/* IDが残留した場合 */
			alert_alt('[コンテンツツリー登録支援ツール]\nいくつかのIDの作品が正常に登録されませんでした。\n繰り返し登録しようとしても失敗する場合は、当該作品が非公開または削除された可能性があります。');
			document.getElementById('ista-auto-list').value = remained_list;
			ista_processing = false;
		} else {
			/* すべてのIDが正常に登録された場合 */
			document.getElementById('ista-auto-modal').style.display    = 'none';
			document.getElementById('ista-auto-modal-bg').style.display = 'none';
			document.getElementById('ista-auto-list').value             = '';
			ista_processing                                             = false;
			document.getElementById('ista-sidebar-bookmarks').classList.remove('visible');
		}
	});
};


/* --- 現在の候補から一括登録を行う --- */
let auto_reg_candidates = () => {
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
		check_linked_commons(item);
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


/* --- ページに要素を追加する --- */
/* 「IDリストから自動登録」ボタンの追加 */
let button_open = document.createElement('a');
button_open.id  = 'ista-open-modal';
button_open.classList.add('btn-01');
button_open.innerText    = '[拡張機能]IDリストから自動登録';
button_open.style.cursor = 'pointer';
button_open.addEventListener('click', () => {
	document.getElementById('ista-auto-modal').style.display    = 'block';
	document.getElementById('ista-auto-modal-bg').style.display = 'block';
	document.getElementById('ista-auto-modal').ondragover = event => {
		event.preventDefault();
		document.getElementById('ista-auto-list').classList.add('ista-dragover');
	};
	document.getElementById('ista-auto-modal').ondragleave = event => {
		document.getElementById('ista-auto-list').classList.remove('ista-dragover');
	};
	document.getElementById('ista-auto-modal').ondrop = event => {
		/* ファイルからID抽出 */
		document.getElementById('ista-auto-list').classList.remove('ista-dragover');
		if (event.dataTransfer.files.length <= 0) return;
		event.preventDefault();
		const extract_func = (name, event) => {
			const regexp       = /(?<=^|[^a-zA-Z0-9])((nc|im|sm|td)\d{2,12})(?=[^a-zA-Z0-9]|$)/g;
			const dropped_text = event.currentTarget.result.replace(/\x00/g, '');
			let ids_in_name  = [... name.matchAll(regexp)];
			let dropped_ids  = [... dropped_text.matchAll(regexp)];
			if (ids_in_name.length > 0) dropped_ids = ids_in_name;
			for (let index in dropped_ids) dropped_ids[index] = dropped_ids[index][1];
			let text_list = document.getElementById('ista-auto-list').value;
			if (text_list.slice(-1) !== '\n' && text_list.length > 0) text_list = text_list + '\n';
			text_list = text_list + optimize_list(dropped_ids.join(' '),false).join('\n');
			document.getElementById('ista-auto-list').value = text_list;
		}
		for (let file of event.dataTransfer.files) {
			const reader = new FileReader();
			reader.addEventListener('load', extract_func.bind(this, file.name));
			reader.readAsText(file);
		}
	};
	document.getElementById('ista-auto-button').onclick = add_materials;
	let select           = document.getElementById('site_selector');
	select.selectedIndex = select.options.length - 1;
	select.dispatchEvent(new Event('change', {bubbles: true, composed: true}));
	/* チェックボックスに値を反映する */
	document.getElementById('ista-verify-contents').checked = (localStorage.getItem('ista-verify-contents') !== 'false');
});
let parent_button = document.getElementsByClassName('submit')[0];
parent_button.insertBefore(button_open, parent_button.firstChild);
/* モーダルウィンドウの追加 */
let modal_win = document.createElement('div');
modal_win.id = 'ista-auto-modal';
modal_win.classList.add('ista-auto-modal');
modal_win.innerHTML = `
<p>
	使用した素材のIDのリスト(登録できるのは最大300件)を入力してください。ファイル(複数可)を枠内にD&Dすると、そのファイルの中身または名前に含まれる作品ID(動画/静画/コモンズ/立体)を抽出できます。<br>
	各機能のボタンはカーソルを合わせると簡単な説明を見ることができます。
</p>
<button type="button" id="ista-read-parent-works" class="ista-button white" title="(v0.4.1) 親作品の欄にある作品を読み出します。">親作品を読み出し</button>&nbsp;
<button type="button" id="ista-open-sidebar-bookmarks" class="ista-button white" title="(v0.4.2) ブラウザのブックマークから作品IDを選択して追加します。">ニコニコ・ブックマーク</button>&nbsp;
<button type="button" id="ista-get-parents-of-parents" class="ista-button white" title="(v0.5.3) 選択範囲の作品の親作品を取得します。">ツリー・チェイン</button><br>
<label for="ista-verify-contents" title="(v0.3.2) これがOnのとき、親作品に登録できなかった作品を自動で確認してお知らせします。"><input type="checkbox" id="ista-verify-contents" checked>&nbsp;書き込み検証を行う</label>
<textarea id="ista-auto-list"></textarea>
<button id="ista-auto-button" class="ista-button">自動登録</button>
`;
parent_button.parentNode.insertBefore(modal_win, parent_button);
/* モーダル背景の追加 */
let modal_win_bg = document.createElement('div');
modal_win_bg.id  = 'ista-auto-modal-bg';
modal_win_bg.classList.add('ista-auto-modal-bg');
parent_button.parentNode.insertBefore(modal_win_bg, parent_button);
modal_win_bg.addEventListener('click', () => {
	if( !ista_processing ) {
		document.getElementById('ista-auto-modal').style.display    = 'none';
		document.getElementById('ista-auto-modal-bg').style.display = 'none';
		document.getElementById('ista-sidebar-bookmarks').classList.remove('visible');
	}
});
/* 「一括登録」ボタンの追加 */
let button_reg = document.createElement('button');
button_reg.classList.add('ista-button-reg');
button_reg.innerText = '[拡張機能]一括登録';
button_reg.title     = 'このボタンをクリックすると候補作品を一括で親作品欄に移動することができます。'
button_reg.addEventListener('click', auto_reg_candidates);
document.querySelector("#Column01 > div.tree-edit-area.editbox.round5-t > p.helpimg").addEventListener('click', auto_reg_candidates);
document.querySelector("#Column01 > div.tree-edit-area.editbox.round5-t > p.helpimg img").title = '[拡張機能] (v0.3.4)この矢印をクリックすると候補作品を一括で親作品欄に移動することができます。';
let parent_h3 = document.querySelector('div.search-parent h3');
parent_h3.appendChild(button_reg);
/* コンテンツツリーの連携がある場合のお知らせメッセージ */
const p_submit           = document.querySelector('p.submit');
const notice_message     = document.createElement('p');
notice_message.innerText = '[拡張機能] 1つ以上のコモンズ作品にコンテンツツリーの連携が設定されていたため、登録先を切り替えました。';
notice_message.hidden    = true;
p_submit.insertBefore(notice_message, p_submit.firstChild);


/* --- 候補作品をクリックで移動させるためのイベント --- */
let click_to_reg = event => {
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
	check_linked_commons(event.currentTarget);
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
			item.addEventListener('click', click_to_reg);
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
		const id_list   = optimize_list(selection.toString(), false).join(' ').split(' ');
		if (id_list.length < 1) return;
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
		const textarea   = document.getElementById('ista-auto-list');
		let current_text = textarea.value;
		if (current_text.slice(-1) !== '\n') current_text += '\n';
		textarea.value = current_text + id_text;
	});
};


/* --- [ニコニコ・ブックマーク] サイドバーを準備する --- */
const generateSidebarBookmarks = () => {
	/* 要素がなければ生成 */
	if (document.getElementById('ista-sidebar-bookmarks')) return;
	/* まずはベースを作成 */
	let div = document.createElement('div');
	div.id  = 'ista-sidebar-bookmarks';
	div.classList.add('ista-sidebar');
	document.body.appendChild(div);
	/* タイトルバーを作成 */
	let title = document.createElement('div');
	title.id  = 'ista-sidebar-bookmarks-title';
	title.classList.add('ista-sidebar-title');
	title.innerText = 'ニコニコ・ブックマーク';
	div.appendChild(title);
	/* ボタン用エリアを作成 */
	let area_buttons   = document.createElement('div');
	let button_back    = document.createElement('button');
	let button_add_all = document.createElement('button');
	area_buttons.id    = 'ista-sidebar-bookmarks-buttons';
	area_buttons.classList.add('ista-sidebar-buttons');
	button_back.id    = 'ista-sidebar-bookmarks-button-back';
	button_add_all.id = 'ista-sidebar-bookmarks-button-add_all';
	button_back.classList.add('ista-button', 'white');
	button_add_all.classList.add('ista-button', 'white');
	button_back.innerText    = '戻る';
	button_add_all.innerText = 'すべて追加';
	button_back.addEventListener('click', event => {
		const i = String(document.getElementById('ista-sidebar-bookmarks-title').getAttribute('current-index'));
		document.getElementById('ista-sidebar-bookmarks-list-'+i).classList.remove('visible');
		document.getElementById('ista-sidebar-bookmarks-buttons').classList.remove('visible');
		document.getElementById('ista-sidebar-bookmarks-title').innerText = 'ニコニコ・ブックマーク';
		document.getElementById('ista-sidebar-bookmarks-folders').classList.add('visible');
	});
	button_add_all.addEventListener('click', event => {
		const i            = String(document.getElementById('ista-sidebar-bookmarks-title').getAttribute('current-index'));
		const current_area = document.getElementById('ista-auto-list');
		let works          = [...document.getElementById('ista-sidebar-bookmarks-list-'+String(i)).children].filter(elem => !elem.classList.contains('added'));
		works              = works.map(elem => {
			elem.classList.add('added');
			return elem.getAttribute('work-id');
		});
		if (current_area.value.length > 0 && current_area.value.slice(-1) !== '\n') current_area.value += '\n';
		current_area.value += works.join(' ');
	});
	area_buttons.appendChild(button_back);
	area_buttons.appendChild(button_add_all);
	div.appendChild(area_buttons);
	/* フォルダ一覧の箱を作成 */
	let folders = document.createElement('div');
	folders.id  = 'ista-sidebar-bookmarks-folders';
	folders.classList.add('ista-sidebar-list', 'folders', 'visible');
	div.appendChild(folders);
	/* モーダルウィンドウのボタンにイベント登録 */
	document.getElementById('ista-open-sidebar-bookmarks').addEventListener('click', openSidebarBookmarks);
};
button_open.addEventListener('click', generateSidebarBookmarks);


/* --- [ニコニコ・ブックマーク] サイドバーを開く --- */
const openSidebarBookmarks = () => {
	/* 要素の存在チェック */
	if (!document.getElementById('ista-sidebar-bookmarks')) return;
	let div_lists = [...document.getElementsByClassName('ista-sidebar-list')].filter(div => !div.classList.contains('folders'));
	div_lists.forEach(div => div.remove());
	[...document.getElementById('ista-sidebar-bookmarks-folders').children].forEach(div => div.remove());
	/* ブックマーク内の作品一覧を取得 */
	browser.runtime.sendMessage({request:'get-bookmarks'}, response => {
		if (response.length > 0) {
			/* フォルダ→作品一覧のイベント作成 */
			const openSidebarWorks = event => {
				const i            = event.currentTarget.getAttribute('folder-index');
				const current_text = document.getElementById('ista-auto-list').value;
				document.getElementById('ista-sidebar-bookmarks-title').setAttribute('current-index', String(i));
				document.getElementById('ista-sidebar-bookmarks-title').innerText = event.currentTarget.innerText;
				document.getElementById('ista-sidebar-bookmarks-folders').classList.remove('visible');
				document.getElementById('ista-sidebar-bookmarks-buttons').classList.add('visible');
				[...document.getElementById('ista-sidebar-bookmarks-list-'+String(i)).children].forEach(elem => {
					if (current_text.indexOf(elem.getAttribute('work-id')) > -1) {
						elem.classList.add('added');
					} else {
						elem.classList.remove('added');
					}
				});
				document.getElementById('ista-sidebar-bookmarks-list-'+String(i)).classList.add('visible');
			};
			/* 作品クリックでIDを追加するイベントハンドラ */
			const addWorkFromBookmarks = event => {
				const id           = event.currentTarget.getAttribute('work-id');
				const area_list    = document.getElementById('ista-auto-list');
				let current_text   = area_list.value;
				if (current_text.length > 0 && current_text.slice(-1) !== ' ' && current_text.slice(-1) !== '\n') current_text += ' ';
				area_list.value = current_text + id;
				event.currentTarget.classList.add('added');
			};
			/* 作品一覧を生成 */
			response.forEach((element, index) => {
				/* フォルダ要素を追加 */
				let folder       = document.createElement('div');
				folder.innerText = element.name;
				folder.setAttribute('folder-index', String(index));
				folder.addEventListener('click', openSidebarWorks);
				document.getElementById('ista-sidebar-bookmarks-folders').appendChild(folder);
				/* 作品一覧を追加 */
				let works = document.createElement('div');
				works.id  = 'ista-sidebar-bookmarks-list-' + String(index);
				works.classList.add('ista-sidebar-list');
				document.getElementById('ista-sidebar-bookmarks').appendChild(works);
				element.works.forEach(data => {
					let work       = document.createElement('div');
					work.innerText = data.name + '\n(' + data.id + ')';
					work.setAttribute('work-id', data.id);
					work.addEventListener('click', addWorkFromBookmarks);
					works.appendChild(work);
				});
			});
		} else {
			/* ブックマーク内に作品が存在しない */
			let folder       = document.createElement('div');
			folder.innerText = 'ニコニコ作品が見つかりませんでした。';
			folder.classList.add('error');
			document.getElementById('ista-sidebar-bookmarks-folders').appendChild(folder);
		}
		/* サイドバーのベースを表示する */
		document.getElementById('ista-sidebar-bookmarks-title').innerText = 'ニコニコ・ブックマーク';
		document.getElementById('ista-sidebar-bookmarks-buttons').classList.remove('visible');
		document.getElementById('ista-sidebar-bookmarks').classList.add('visible');
		document.getElementById('ista-sidebar-bookmarks-folders').classList.add('visible');
	});
};


/* --- [ニコニコ・ブックマーク] サイドバーを閉じる --- */
const closeSidebarBookmarks = () => {
	/* 要素の存在チェック */
	if (!document.getElementById('ista-sidebar-bookmarks')) return;
	/* サイドバーのベースを表示する */
	document.getElementById('ista-sidebar-bookmarks').classList.remove('visible');
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
		materials_list = optimize_list(materials_list, false).join('\n');
	}
	document.getElementById('ista-auto-list').value = materials_list;
};
button_open.addEventListener('click', () => {
	document.getElementById('ista-read-parent-works').addEventListener('click', readParentWorks);
});


/* --- 連携付きコモンズ作品を連携先の表示に変更 --- */
const check_linked_commons = (element, do_replace = true) => {
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
