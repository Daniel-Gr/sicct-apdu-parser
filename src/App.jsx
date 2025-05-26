import { useState } from 'react';
import './App.css';

function App() {
    const [input, setInput] = useState('');
    const [responseInput, setResponseInput] = useState('');
    const [parsed, setParsed] = useState(null);
    const [swDecoded, setSwDecoded] = useState(null);

    const statusWords = {
        '9000': 'Success',
        '6A82': 'File not found',
        '6A84': 'Not enough memory space',
        '6982': 'Security status not satisfied',
        '6A86': 'Incorrect P1 or P2',
        '6A88': 'Referenced data not found',
        '6700': 'Wrong length',
        '6985': 'Conditions of use not satisfied',
        '6D00': 'Instruction code not supported',
        '6E00': 'Class not supported',
        '6283': 'State of non-volatile memory unchanged; selected file invalidated',
        '63CX': 'Verification failed; X retries remaining', // X = retry count
    };

    const instructionSet = {
        'A4': 'SELECT FILE',
        'B0': 'READ BINARY',
        'D6': 'UPDATE BINARY',
        'B2': 'READ RECORD',
        'DC': 'UPDATE RECORD',
        '20': 'VERIFY (PIN)',
        '24': 'CHANGE REFERENCE DATA',
        '2C': 'RESET RETRY COUNTER',
        '84': 'GET CHALLENGE',
        '88': 'INTERNAL AUTHENTICATE',
        '82': 'EXTERNAL AUTHENTICATE',
        'CA': 'GET DATA',
        'CB': 'GET DATA (complex)',
        '2A': 'PERFORM SECURITY OPERATION (PSO)',
        'C0': 'GET RESPONSE',
    };

    const explain = {
        CLA: 'Class byte (CLA) - Indicates the type of command.',
        INS: 'Instruction byte (INS) - Specifies the command.',
        P1: 'Parameter 1 (P1) - Often used to specify options or data references.',
        P2: 'Parameter 2 (P2) - Used alongside P1.',
        Lc: 'Length of command data (Lc) - Number of bytes in the Data field.',
        Data: 'Command Data - Payload sent to the card.',
        Le: 'Expected length of response (Le) - Max number of bytes expected in response.',
        Case: 'APDU Case - Type of APDU structure (1 to 4) based on presence of data and response expectations.'
    };

    const getApduCase = (hasLc, hasData, hasLe) => {
        if (!hasLc && !hasLe) return 'Case 1: No data, no response expected';
        if (!hasLc && hasLe) return 'Case 2: Response expected';
        if (hasLc && hasData && !hasLe) return 'Case 3: Data sent, no response expected';
        if (hasLc && hasData && hasLe) return 'Case 4: Data sent, response expected';
        return 'Unknown or malformed APDU';
    };

    const parseAPDU = (hexString) => {
        const cleanHex = hexString.replace(/\s+/g, '').toUpperCase();
        if (cleanHex.length < 8) return { error: 'Too short to be a valid APDU.' };

        const CLA = cleanHex.slice(0, 2);
        const INS = cleanHex.slice(2, 4);
        const P1 = cleanHex.slice(4, 6);
        const P2 = cleanHex.slice(6, 8);

        let index = 8;
        let Lc = null, Data = null, Le = null;

        if (cleanHex.length > index) {
            Lc = parseInt(cleanHex.slice(index, index + 2), 16);
            index += 2;
            if (cleanHex.length >= index + Lc * 2) {
                Data = cleanHex.slice(index, index + Lc * 2);
                index += Lc * 2;
                if (cleanHex.length > index) {
                    Le = parseInt(cleanHex.slice(index, index + 2), 16);
                }
            } else {
                Le = Lc;
                Lc = null;
            }
        }

        const apduCase = getApduCase(!!Lc, !!Data, !!Le);

        return { CLA, INS, P1, P2, Lc, Data, Le, Case: apduCase };
    };

    const decodeStatusWord = (hex) => {
        const cleaned = hex.replace(/\s+/g, '').toUpperCase();
        if (cleaned.length !== 4) return null;

        const known = statusWords[cleaned];
        if (known) return known;

        // Handle 63CX (where X = retries)
        if (cleaned.startsWith('63C')) {
            const retries = cleaned.slice(3, 4);
            return `Verification failed; ${retries} retries remaining`;
        }

        return 'Unknown status word';
    };

    const handleCommandChange = (e) => {
        const val = e.target.value;
        setInput(val);
        const result = parseAPDU(val);
        setParsed(result);
    };

    const handleResponseChange = (e) => {
        const val = e.target.value;
        setResponseInput(val);
        const decoded = decodeStatusWord(val);
        setSwDecoded(decoded);
    };

    return (
        <div className="container">
            <h1>SICCT / APDU Parser</h1>

            <label>Command APDU</label>
            <input
                type="text"
                placeholder="e.g., 00A4040007A0000002471001"
                value={input}
                onChange={handleCommandChange}
            />

            {parsed && parsed.error ? (
                <p className="error">{parsed.error}</p>
            ) : parsed ? (
                <div className="result">
                    {Object.entries(parsed).map(([key, val]) => (
                        val !== null && (
                            <div key={key}>
                                <strong>{key}:</strong> {val.toString()}
                                <div className="info">{explain[key]}</div>
                                {key === 'INS' && instructionSet[val] && (
                                    <div className="instruction">→ {instructionSet[val]}</div>
                                )}
                            </div>
                        )
                    ))}
                </div>
            ) : null}

            <hr style={{ margin: '2rem 0' }} />

            <label>Response APDU (SW1SW2)</label>
            <input
                type="text"
                placeholder="e.g., 9000"
                value={responseInput}
                onChange={handleResponseChange}
            />

            {swDecoded && (
                <div className="result">
                    <strong>Status Word Meaning:</strong>
                    <div className="instruction">{swDecoded}</div>
                </div>
            )}
        </div>
    );
}

export default App;
