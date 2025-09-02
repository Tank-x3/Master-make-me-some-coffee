// --- グローバル変数と定数 ---
const SPECIAL_EFFECT_KEYWORD = "特殊効果つき";
let menuData = {}; 

// --- 初期化処理 ---
document.addEventListener('DOMContentLoaded', () => {
    fetch('menu_data.json')
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            menuData = data;
            initializeUI();
        })
        .catch(error => {
            console.error('menu_data.jsonの読み込みに失敗しました:', error);
            const resultTextarea = document.getElementById('result-text');
            resultTextarea.value = "エラー: メニューデータの読み込みに失敗しました。\n\n" +
                "このツールをテストするには、ローカルサーバーを起動する必要があります。\n" +
                "詳細は開発者にお問い合わせください。";
            alert('メニューデータの読み込みに失敗しました。ローカルサーバー環境で実行しているか確認してください。');
        });
});

function initializeUI() {
    // (変更なし)
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
    document.getElementById('copy-button').addEventListener('click', copyToClipboard);
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
    const shouldAutoCopy = document.getElementById('autocopy-checkbox').checked; // ★★★ オプション取得 ★★★
    
    const selectedGenre = document.querySelector('input[name="genre"]:checked').value;
    const diceInputs = [
        document.getElementById('dice1').value,
        document.getElementById('dice2').value,
        document.getElementById('dice3').value
    ];

    if (diceInputs.some(val => val === '')) {
        alert("エラー: ダイス目を3つすべて入力してください。");
        if (shouldReset) clearDiceEntries();
        return;
    }
    
    const diceResults = [];
    for (const val of diceInputs) {
        const num = parseInt(val, 10);
        if (isNaN(num)) {
            alert("エラー: ダイス目には半角数字を入力してください。");
            if (shouldReset) clearDiceEntries();
            return;
        }
        diceResults.push(num);
    }

    const result = generateMenu(selectedGenre, diceResults);
    const resultTextarea = document.getElementById('result-text');
    
    if (result.startsWith("エラー:")) {
        alert(result);
        resultTextarea.value = "";
    } else {
        resultTextarea.value = result;
        // ★★★ 正常処理時のみ自動コピーを実行 ★★★
        if (shouldAutoCopy) {
            copyToClipboard(true); // trueを渡して通知をボタンテキストの変更にする
        }
    }
    
    if (shouldReset) clearDiceEntries();
}

// (generateMenu関数は変更なし)
function generateMenu(genre, diceResults) {
    const rules = menuData[genre];
    if (!rules) return `エラー: 指定されたジャンル '${genre}' は存在しません。`;
    const { dice_type, parts, リスト } = rules;
    if (diceResults.length !== parts.length) return `エラー: ${genre}では${parts.length}個のダイス目が必要です。`;
    for (const d of diceResults) {
        if (!(1 <= d && d <= dice_type)) return `エラー: '${d}' という出目は入力できません。\nこのジャンルでは${dice_type}面ダイスを使用します。振ったダイスを確認してください。`;
    }
    try {
        const menuParts = parts.map((key, i) => リスト[key][diceResults[i] - 1]);
        const fullMenuName = menuParts.join(" ");
        if (menuParts[0] === SPECIAL_EFFECT_KEYWORD) {
            const specialRules = menuData["特殊効果"];
            if (!specialRules) return `「${fullMenuName}」`;
            let output = `「${fullMenuName}」\n\n`;
            output += `dice1d${specialRules.dice_type}=\n`;
            output += specialRules.リスト.map((effect, i) => `${i + 1}　${effect}`).join("\n");
            return output;
        }
        return `「${fullMenuName}」`;
    } catch (e) {
        return "エラー: データファイルの構造が正しくないか、対応するメニューが見つかりません。";
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
        
        // 手動コピーの場合のみアラートを表示
        if (!isAuto) {
            alert("結果をクリップボードにコピーしました。");
        }
    }, (err) => {
        if (!isAuto) alert("コピーに失敗しました。");
        console.error('コピー失敗:', err);
    });
}

/**
 * 入力欄をクリアする関数 (変更なし)
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
