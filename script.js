// --- グローバル変数と定数 ---
const SPECIAL_EFFECT_KEYWORD = "特殊効果つき";
let menuData = {}; // menu_data.jsonの内容を保持する変数

// --- 初期化処理 ---
document.addEventListener('DOMContentLoaded', () => {
    // ページが読み込まれたらJSONデータを取得し、UIを初期化する
    fetch('menu_data.json')
        .then(response => {
            if (!response.ok) {
                // HTTPステータスが200番台でない場合のエラー
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            menuData = data;
            initializeUI();
        })
        .catch(error => {
            console.error('menu_data.jsonの読み込みに失敗しました:', error);
            // ユーザーへのエラーメッセージをより具体的に
            const resultTextarea = document.getElementById('result-text');
            // ★★★ メッセージ変更 (No.1) ★★★
            const errorMessage = "おおっと……メニューデータが読み込めねぇな。ローカルサーバー環境になってない？あ、違う……？";
            resultTextarea.value = errorMessage;
            alert(errorMessage);
        });
});

/**
 * UIを構築し、イベントリスナーを設定する
 */
function initializeUI() {
    const genreSelector = document.getElementById('genre-selector');
    const genres = Object.keys(menuData).filter(key => key !== "特殊効果");

    genres.forEach((genre, index) => {
        const label = document.createElement('label');
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'genre';
        radio.value = genre;
        if (index === 0) radio.checked = true;
        
        radio.addEventListener('click', (e) => e.target.focus());
        
        label.appendChild(radio);
        label.appendChild(document.createTextNode(genre));
        genreSelector.appendChild(label);
    });

    document.getElementById('generate-button').addEventListener('click', generateAndDisplayResult);
    document.getElementById('copy-button').addEventListener('click', () => copyToClipboard(false));
}


/**
 * 「テキスト化！」ボタンが押されたときの処理
 */
function generateAndDisplayResult() {
    if (Object.keys(menuData).length === 0) {
        alert("メニューデータがまだ読み込まれていません。");
        return;
    }

    const shouldReset = document.getElementById('reset-checkbox').checked;
    const shouldAutoCopy = document.getElementById('autocopy-checkbox').checked;
    
    const selectedGenre = document.querySelector('input[name="genre"]:checked').value;
    const diceInputs = [
        document.getElementById('dice1').value,
        document.getElementById('dice2').value,
        document.getElementById('dice3').value
    ];

    if (diceInputs.some(val => val === '')) {
        // ★★★ メッセージ変更 (No.2) ★★★
        alert("＼ダイス目を3つ全て入力するんだねー！！ﾏﾛﾏﾛﾏﾛﾏﾛ……／");
        if (shouldReset) clearDiceEntries();
        return;
    }
    
    const diceResults = [];
    for (const val of diceInputs) {
        const num = parseInt(val, 10);
        if (isNaN(num)) {
            // ★★★ メッセージ変更 (No.3) ★★★
            alert("あ、ああ、あ、あ、あああのっ！！だ、だだ、ダイス目は……は、は、半角数字を……つ、つつ、つかって、ほしい……か、かな………あ、ああ、ご、ごめんね？");
            if (shouldReset) clearDiceEntries();
            return;
        }
        diceResults.push(num);
    }

    const result = generateMenu(selectedGenre, diceResults);
    const resultTextarea = document.getElementById('result-text');
    
    if (result.startsWith("エラー:")) {
        // エラーメッセージからプレフィックス "エラー: " を取り除く
        alert(result.replace(/^エラー: /, ""));
        resultTextarea.value = "";
    } else {
        resultTextarea.value = result;
        if (shouldAutoCopy) {
            copyToClipboard(true);
        }
    }
    
    if (shouldReset) clearDiceEntries();
}

/**
 * ダイス目からメニューテキストを生成するコアロジック
 */
function generateMenu(genre, diceResults) {
    const rules = menuData[genre];
    if (!rules) {
        return `エラー: 指定されたジャンル '${genre}' は存在しません。`;
    }

    const { dice_type, parts, リスト } = rules;

    if (diceResults.length !== parts.length) {
        return `エラー: ${genre}では${parts.length}個のダイス目が必要です。`;
    }

    for (const d of diceResults) {
        if (!(1 <= d && d <= dice_type)) {
            // ★★★ メッセージ変更 (No.4) ★★★
            let message = "ははは、バカめ………このダイスは（面数）面体ダイスを使うんだよ……出直してきな……";
            message = message.replace("（面数）", dice_type).replace("（出目）", d);
            return `エラー: ${message}`;
        }
    }

    try {
        const menuParts = parts.map((key, i) => リスト[key][diceResults[i] - 1]);
        const fullMenuName = menuParts.join(" ");

        const isSpecialEffect = menuParts[0] === SPECIAL_EFFECT_KEYWORD;
        
        if (isSpecialEffect) {
            const specialRules = menuData["特殊効果"];
            if (!specialRules) return `「${fullMenuName}」`;

            const effectDiceType = specialRules.dice_type;
            const effectList = specialRules.リスト;
            
            let output = `「${fullMenuName}」\n\n`;
            output += `dice1d${effectDiceType}=\n`;
            output += effectList.map((effect, i) => `${i + 1}　${effect}`).join("\n");
            
            return output;
        } else {
            return `「${fullMenuName}」`;
        }
    } catch (e) {
        console.error(e);
        // ★★★ メッセージ変更 (No.5) ★★★
        return "エラー: ……………おいおい、これぶっ壊れてねぇかぁ？対応してるメニューねぇぞ？";
    }
}

/**
 * 「結果をコピー」ボタンが押されたときの処理
 * @param {boolean} isAuto - 自動コピーかどうかを判定するフラグ
 */
function copyToClipboard(isAuto = false) {
    const resultTextarea = document.getElementById('result-text');
    const content = resultTextarea.value;

    if (!content) {
        if (!isAuto) alert("コピーする内容がありません。");
        return;
    }

    navigator.clipboard.writeText(content).then(() => {
        const copyButton = document.getElementById('copy-button');
        const originalText = copyButton.textContent;
        copyButton.textContent = 'コピー完了！';
        setTimeout(() => { copyButton.textContent = originalText; }, 2000);
        
        if (!isAuto) {
            alert("結果をクリップボードにコピーしました。");
        }
    }, (err) => {
        if (!isAuto) alert("コピーに失敗しました。");
        console.error('コピー失敗:', err);
    });
}

/**
 * 入力欄をクリアする関数
 */
function clearDiceEntries() {
    const diceInputs = [
        document.getElementById('dice1'),
        document.getElementById('dice2'),
        document.getElementById('dice3')
    ];
    diceInputs.forEach(input => input.value = '');
    diceInputs[0].focus();
}
