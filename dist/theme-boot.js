/* Apply only a whitelisted presentation preference before the first paint. */
(()=>{let theme='engineering';try{const saved=localStorage.getItem('laplab-visual-direction-v1');if(['apple','netflix','engineering','editorial','future','experimental'].includes(saved))theme=saved;}catch{}document.documentElement.dataset.theme=theme;})();
