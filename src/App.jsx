import { useState } from 'react'
import './App.css'

function App() {
    const [input, setInput] = useState('');
    const [parsed, setParsed] = useState(null);

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

        return { CLA, INS, P1, P2, Lc, Data, Le };
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
    };

    const handleChange = (e) => {
        const val = e.target.value;
        setInput(val);
        const result = parseAPDU(val);
        setParsed(result);
    };

    return (
        <div className="container">
            <h1>SICCT / APDU Parser</h1>
            <input
                type="text"
                placeholder="Enter APDU hex (e.g., 00A4040007A0000002471001)"
                value={input}
                onChange={handleChange}
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
        </div>
    );
}

export default App;
