document.addEventListener('DOMContentLoaded', () => {
    // --- DOM要素の取得 ---
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const autoCopyCheck = document.getElementById('auto-copy-check');
    const includeJudgeCheck = document.getElementById('include-judge-check');

    const judgeDiceInput = document.getElementById('judge-dice');
    const menuDice1Input = document.getElementById('menu-dice-1');
    const menuDice2Input = document.getElementById('menu-dice-2');

    const generateBtn = document.getElementById('generate-btn');
    const copyBtn = document.getElementById('copy-btn');

    const resultText = document.getElementById('result-text');
    
    const errorJudge = document.getElementById('error-judge');
    const errorMenu1 = document.getElementById('error-menu-1');
    const errorMenu2 = document.getElementById('error-menu-2');

    let menuData = null; // menu.jsonのデータをキャッシュする変数
    let copyTimeout = null; // コピー通知のタイマー

    // --- 初期化処理 ---

    // 1. ダークモードの初期設定
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }

    // 2. menu.jsonを非同期で読み込む関数
    const loadMenuData = async () => {
        try {
            const response = await fetch('menu.json');
            if (!response.ok) throw new Error('menu.jsonの読み込みに失敗しました。');
            
            const data = await response.json();
            
            if (!validateMenuData(data)) {
                 throw new Error('menu.jsonのデータ整合性に問題があります。');
            }
            
            menuData = data;
            updateUIFromMenuData(); // JSONデータに基づいてUIを更新
        } catch (error) {
            console.error(error);
            generateBtn.disabled = true;
            generateBtn.textContent = 'エラー: 設定を読めません';
        }
    };
    
    // 3. menu.jsonのデータ整合性をチェックする関数
    const validateMenuData = (data) => {
        const faces = data.diceFaces;
        if (!faces || typeof faces !== 'number' || faces < 1) {
            errorMenu1.textContent = '設定エラー: diceFacesが無効です。';
            return false;
        }

        const part1SuccessCount = data.outcomes.part1.success.length;
        const part1FailureCount = data.outcomes.part1.failure.length;
        const part2OptionsCount = data.outcomes.part2.options.length;

        if (faces !== part1SuccessCount || faces !== part1FailureCount || faces !== part2OptionsCount) {
            errorMenu1.textContent = '設定ファイル(menu.json)の項目数に誤りがあります。';
            errorMenu2.textContent = 'diceFacesと各リストの項目数を一致させてください。';
            return false;
        }
        return true;
    };

    // 4. JSONデータに基づいてUIを更新する関数
    const updateUIFromMenuData = () => {
        if (!menuData) return;

        const diceFaces = menuData.diceFaces;

        menuDice1Input.max = diceFaces;
        menuDice1Input.placeholder = `1〜${diceFaces}`;
        
        menuDice2Input.max = diceFaces;
        menuDice2Input.placeholder = `1〜${diceFaces}`;

        const menuLabel = menuDice1Input.closest('.input-group').querySelector('label');
        if (menuLabel) {
            menuLabel.textContent = `メニュー (2d${diceFaces})`;
        }
    };

    // --- イベントリスナーの設定 ---
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    });

    generateBtn.addEventListener('click', handleGenerate);
    copyBtn.addEventListener('click', copyResultText);
    resultText.addEventListener('click', () => resultText.select());

    // --- メインの関数 ---
    function handleGenerate() {
        if (!menuData || !validateInputs()) return;

        const judgeValue = parseInt(judgeDiceInput.value, 10);
        const menu1Value = parseInt(menuDice1Input.value, 10);
        const menu2Value = parseInt(menuDice2Input.value, 10);

        const isSuccess = judgeValue <= menuData.successThreshold;
        const resultPart1 = isSuccess 
            ? menuData.outcomes.part1.success[menu1Value - 1]
            : menuData.outcomes.part1.failure[menu1Value - 1];
        
        const resultPart2 = menuData.outcomes.part2.options[menu2Value - 1];

        let finalText = `「${resultPart1} ${resultPart2}」`;

        if (includeJudgeCheck.checked) {
            const judgeText = `成否判定: ${judgeValue}→${isSuccess ? '成功！' : '失敗…'}`;
            finalText = `${judgeText}\nメニュー: ${finalText}`;
        }
        
        resultText.value = finalText;

        if (autoCopyCheck.checked) copyResultText();
    }

    function validateInputs() {
        let isValid = true;
        [errorJudge, errorMenu1, errorMenu2].forEach(el => el.textContent = '');

        const judgeVal = judgeDiceInput.value;
        const menu1Val = menuDice1Input.value;
        const menu2Val = menuDice2Input.value;
        const diceFaces = menuData.diceFaces;

        if (judgeVal === '' || !/^\d+$/.test(judgeVal)) {
            errorJudge.textContent = '入力が不正か空欄です。成否判定を確認してください';
            isValid = false;
        } else if (parseInt(judgeVal) < 1 || parseInt(judgeVal) > 100) {
            errorJudge.textContent = '成否判定には1d100を使用します。ダイスを確認してください';
            isValid = false;
        }
        
        const menuErrorMsg = `メニューの出目には 1〜${diceFaces} の値を入力してください。`;
        if (menu1Val === '' || !/^\d+$/.test(menu1Val)) {
            errorMenu1.textContent = '入力が不正か空欄です。';
            isValid = false;
        } else if (parseInt(menu1Val) < 1 || parseInt(menu1Val) > diceFaces) {
            errorMenu1.textContent = menuErrorMsg;
            isValid = false;
        }

        if (menu2Val === '' || !/^\d+$/.test(menu2Val)) {
            errorMenu2.textContent = '入力が不正か空欄です。';
            isValid = false;
        } else if (parseInt(menu2Val) < 1 || parseInt(menu2Val) > diceFaces) {
            errorMenu2.textContent = menuErrorMsg;
            isValid = false;
        }
        
        return isValid;
    }
    
    function copyResultText() {
        if (!resultText.value) return;

        navigator.clipboard.writeText(resultText.value).then(() => {
            if (copyTimeout) clearTimeout(copyTimeout);
            copyBtn.textContent = 'コピーしました！';
            copyBtn.style.backgroundColor = 'var(--primary-color)';
            copyTimeout = setTimeout(() => {
                copyBtn.textContent = 'コピー';
                copyBtn.style.backgroundColor = 'var(--secondary-bg-color)';
            }, 2000);
        }).catch(err => console.error('コピーに失敗しました', err));
    }

    loadMenuData();
});