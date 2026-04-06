export const numberToWords = (num, currencyCode = "INR") => {
    if (num === 0) return "Zero";
    const isIndian = currencyCode === "INR";
    const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
    const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    const inWords = (n) => {
        if (n < 20) return a[n];
        if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : "");
        if (n < 1000) return a[Math.floor(n / 100)] + "hundred " + (n % 100 !== 0 ? "and " + inWords(n % 100) : "");
        return "";
    };

    const convert = (n) => {
        if (n === 0) return "";
        if (n < 1000) return inWords(n);

        const scales = isIndian ? [
            { val: 10000000n, unit: "crore " },
            { val: 100000n, unit: "lakh " },
            { val: 1000n, unit: "thousand " }
        ] : [
            { val: 1000000000n, unit: "billion " },
            { val: 1000000n, unit: "million " },
            { val: 1000n, unit: "thousand " }
        ];

        let rem = BigInt(n);
        for (const scale of scales) {
            if (rem >= scale.val) {
                const quotient = rem / scale.val;
                let prefix = convert(Number(quotient));
                if (!prefix.endsWith(" ")) prefix += " ";
                return prefix + scale.unit + convert(Number(rem % scale.val));
            }
        }
        return inWords(Number(rem));
    };

    const whole = Math.floor(num);
    const fraction = Math.round((num - whole) * 100);

    let res = convert(whole);
    if (res === "" && whole === 0) res = "Zero";
    
    if (fraction > 0) {
        const fractionUnit = isIndian ? "paisa " : "cents ";
        res += " & " + inWords(fraction) + fractionUnit;
    }
    return res.trim().toUpperCase() + " ONLY";
};
