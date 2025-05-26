import { useState } from 'react';
import './App.css';

const apduSamples = [
    {
        label: 'SELECT FILE (eGK)',
        value: '00A4040007A0000002471001',
    },
    {
        label: 'GET CHALLENGE',
        value: '0084000008',
    },
    {
        label: 'READ BINARY',
        value: '00B000000F',
    },
    {
        label: 'GET DATA (Certificate)',
        value: '00CA018200',
    },
    {
        label: 'VERIFY PIN (CHV1)',
        value: '0020008008', // CHV1 verify w/ 8-byte PIN
    },
];


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
        'A4': {
            name: 'SELECT FILE',
            context: 'Used to select DF/EF (e.g., EF.GDD, EF.VD) before READ BINARY.',
        },
        'B0': {
            name: 'READ BINARY',
            context: 'Reads data from selected EF. Common for insurance info (EF.VD).',
        },
        '20': {
            name: 'VERIFY (PIN)',
            context: 'Authenticates cardholder (CHV1) before secure operations.',
        },
        '84': {
            name: 'GET CHALLENGE',
            context: 'Used to initiate challenge-response authentication.',
        },
        '82': {
            name: 'EXTERNAL AUTHENTICATE',
            context: 'Completes challenge-response authentication using terminal’s signature.',
        },
        '88': {
            name: 'INTERNAL AUTHENTICATE',
            context: 'Used in digital signature processes.',
        },
        '2A': {
            name: 'PERFORM SECURITY OPERATION (PSO)',
            context: 'Executes signing or key agreement. Used with HBA/eGK in E-Rezept.',
        },
        'CA': {
            name: 'GET DATA',
            context: 'Fetches public certificates or status attributes.',
        },
        'C0': {
            name: 'GET RESPONSE',
            context: 'Retrieves remaining data when initial response is too short.',
        }
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

            <div style={{marginBottom: '1rem'}}>
                <label>Sample APDUs:</label>
                <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem'}}>
                    {apduSamples.map((sample) => (
                        <button
                            key={sample.label}
                            style={{
                                padding: '6px 10px',
                                border: '1px solid #ccc',
                                borderRadius: '6px',
                                background: '#f5f5f5',
                                cursor: 'pointer',
                                fontSize: '0.9rem'
                            }}
                            onClick={() => {
                                setInput(sample.value);
                                setParsed(parseAPDU(sample.value));
                            }}
                        >
                            {sample.label}
                        </button>
                    ))}
                </div>
            </div>


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
                                    <div className="instruction">
                                        → <strong>{instructionSet[val].name}</strong>
                                        <div className="info">{instructionSet[val].context}</div>
                                    </div>
                                )}
                            </div>
                        )
                    ))}
                </div>
            ) : null}

            <hr style={{margin: '2rem 0'}}/>

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
