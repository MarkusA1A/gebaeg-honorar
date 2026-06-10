// GebAG § 51 Gebührentarife – BGBl. II Nr. 430/2023, ab 1.1.2024
const TARIFE = {
    haus: {
        name: 'Hausschätzung',
        staffeln: [
            { bis: 36340, gebühr: 602.30 },
            { bis: 72670, gebühr: 1056.90 },
            { über: 72670, gebühr: 1056.90, zuschlag: 176.50, pro: 36340 }
        ]
    },
    baugrund: {
        name: 'Baugrundschätzung',
        staffeln: [
            { bis: 5090, gebühr: 162.30 },
            { bis: 7270, gebühr: 211.80 },
            { über: 7270, gebühr: 211.80, zuschlag: 32.90, pro: 3630 }
        ]
    }
};

function formatSchätzwert(input) {
    const cursor = input.selectionStart;
    const raw = input.value;

    // Zeichenanzahl vor dem Cursor (ohne Tausenderpunkte) merken
    let significantBeforeCursor = 0;
    for (let i = 0; i < cursor; i++) {
        if (raw[i] !== '.') significantBeforeCursor++;
    }

    // Komma als Dezimaltrennzeichen, Punkte ignorieren (werden neu gesetzt)
    const commaIdx = raw.indexOf(',');
    let intPart, decPart;
    if (commaIdx >= 0) {
        intPart = raw.substring(0, commaIdx).replace(/[^\d]/g, '');
        decPart = raw.substring(commaIdx + 1).replace(/[^\d]/g, '');
    } else {
        intPart = raw.replace(/[^\d]/g, '');
        decPart = null;
    }

    const formattedInt = intPart ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '';
    const newVal = decPart !== null ? formattedInt + ',' + decPart : formattedInt;
    input.value = newVal;

    // Cursor relativ zu den bedeutenden Zeichen wiederherstellen
    let newCursor = 0;
    let counted = 0;
    while (newCursor < newVal.length && counted < significantBeforeCursor) {
        if (newVal[newCursor] !== '.') counted++;
        newCursor++;
    }
    input.setSelectionRange(newCursor, newCursor);
}

function updateDefaults() {
    document.getElementById('schätzwert').value = '';
    document.getElementById('resultSection').style.display = 'none';
    document.getElementById('anteil').checked = false;
    document.getElementById('wohnung').checked = false;
}

function calculate(scrollToResult = false) {
    const schätzungstyp = document.getElementById('schätzungstyp').value;
    const schätzwertInput = document.getElementById('schätzwert').value.trim();
    
    // Validierung: Feld leer lassen ist OK, aber wenn was eingegeben wird, muss es eine Zahl sein
    if (schätzwertInput === '') {
        document.getElementById('resultSection').style.display = 'none';
        return;
    }
    
    const schätzwert = parseFloat(schätzwertInput.replace(/\./g, '').replace(',', '.'));
    
    // Validierung: Muss eine gültige Zahl sein
    if (isNaN(schätzwert)) {
        console.error('Fehler: Schätzwert ist keine gültige Zahl');
        document.getElementById('resultSection').style.display = 'none';
        return;
    }
    
    const istAnteil = document.getElementById('anteil').checked;
    const istWohnung = document.getElementById('wohnung').checked;

    if (schätzwert <= 0) {
        document.getElementById('resultSection').style.display = 'none';
        return;
    }

    const tarif = TARIFE[schätzungstyp];
    let grundgebühr = calculateGrundgebühr(schätzwert, tarif.staffeln);
    let zuschlag = 0;

    // Zuschläge anwenden
    if (istAnteil || istWohnung) {
        zuschlag = grundgebühr * 0.50;
    }

    const verrechnungsbetrag = grundgebühr + zuschlag;

    // Ergebnisse anzeigen
    document.getElementById('resultSection').style.display = 'block';
    document.getElementById('resultTyp').textContent = tarif.name;
    document.getElementById('resultWert').textContent = formatCurrency(schätzwert);
    document.getElementById('resultGrund').textContent = formatCurrency(grundgebühr);

    if (zuschlag > 0) {
        document.getElementById('zuschlagDetail').style.display = 'flex';
        document.getElementById('resultZuschlag').textContent = formatCurrency(zuschlag);
    } else {
        document.getElementById('zuschlagDetail').style.display = 'none';
    }

    document.getElementById('resultAmount').textContent = formatCurrency(verrechnungsbetrag);

    // Smooth scroll nur bei explizitem Klick auf "Berechnen",
    // damit die Seite beim Tippen am Handy nicht springt
    if (scrollToResult) {
        document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function calculateGrundgebühr(wert, staffeln) {
    for (let staffel of staffeln) {
        if (staffel.bis && wert <= staffel.bis) {
            return staffel.gebühr;
        }
    }

    // Über höchste Staffel
    const letztestaffel = staffeln[staffeln.length - 1];
    if (letztestaffel.über) {
        const basisgebühr = letztestaffel.gebühr;
        const überschuss = wert - letztestaffel.über;
        const anzahlStaffeln = Math.ceil(überschuss / letztestaffel.pro);
        return basisgebühr + (anzahlStaffeln * letztestaffel.zuschlag);
    }

    return letztestaffel.gebühr;
}

function formatCurrency(value) {
    return new Intl.NumberFormat('de-AT', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}
