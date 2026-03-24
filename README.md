# Tunic

**Beautiful Addresses, Made for You**

Tunic is a fully client-side vanity address generator for EVM-compatible chains and Solana. Enter a pattern or your name, and Tunic finds a wallet address that ends or starts with it. Everything runs in your browser. Nothing ever leaves your device.

---

## Features

### Available (V1)
- Generate vanity EVM addresses with custom prefix, suffix, or combine (prefix + suffix) pattern
- Leetspeak converter: input your name or any word, Tunic converts it into up to 4 hex-compatible variants for you to choose from
- Multi-worker parallelism: automatically detects your CPU core count and runs multiple workers simultaneously to maximize brute-force speed
- SharedArrayBuffer coordination: workers self-terminate the moment a result is found, no wasted computation
- Fully client-side: no server, no API, no database, no logging of any kind
- Offline-ready: download the static build and run it without an internet connection

### In Progress (V2)
- Solana vanity address generation
- Solana uses Base58 encoding, which means names like `bagas` or `singgih` can be used directly as patterns without any conversion
- Separate `solana-engine` WASM module running in parallel with `evm-engine`

### Planned (V3)
- ERC-4337 smart contract wallet with WebAuthn (biometric) signer
- Vanity address via CREATE2 salt brute-force
- WalletConnect integration for DeFi connectivity
- Paymaster support for gasless transactions
- Multi-chain expansion

---

## How It Works

### Pattern Input
Two input methods are available:

**Manual pattern**: enter a hex pattern directly (e.g. `3504`, `dead`, `cafe`). For EVM, only characters `0-9` and `a-f` are valid. For Solana (coming soon), the full Base58 alphabet is supported.

**Leetspeak converter**: enter your name or a word (max 6 characters). Tunic maps characters to hex-compatible substitutions and generates up to 4 variants for you to pick from.

| Input | Possible variants |
|---|---|
| `cafe` | `cafe`, `c4fe`, `caf3`, `c4f3` |
| `bagas` | `8494`, `b494`, `8a94`, `ba94` |
| `singgih` | `51991` (n and h are skipped, no hex equivalent) |

### Position Mode
- **Suffix**: pattern appears at the end of the address → `0x....3504`
- **Prefix**: pattern appears at the start → `0x3504....`
- **Combine**: pattern appears at both ends → `0x3504....3504`

> Combine mode doubles the search space per character. A 3-character combine pattern is equivalent in difficulty to a 6-character single-end pattern. Keep combine patterns at 3 characters or fewer for reasonable generation time.

### Generation Speed Estimates (EVM, single pattern end)

| Pattern Length | Estimated Time |
|---|---|
| 4 characters | under 1 second |
| 5 characters | a few seconds |
| 6 characters | tens of seconds |
| 8 characters | several minutes |

Actual speed depends on your hardware. Tunic automatically scales to your CPU core count.

### How Address Generation Works

**EVM:**
```
1. Generate 32 random bytes as private key
   └── via browser's crypto.getRandomValues (CSPRNG)
2. Derive public key via ECDSA secp256k1
3. keccak256 hash the public key
4. Take last 20 bytes as the Ethereum address
5. Check if address matches your pattern
6. Match found → return { address, private_key }
   No match → repeat from step 1
```

**Solana (coming soon):**
```
1. Generate 32 random bytes as private key
   └── via browser's crypto.getRandomValues (CSPRNG)
2. Derive public key via Ed25519
3. Base58 encode the public key directly as the address (no hashing)
4. Check if address matches your pattern
5. Match found → return { address, private_key }
   No match → repeat from step 1
```

### Multi-Worker Parallelism

Tunic detects the number of logical CPU cores on your device via `navigator.hardwareConcurrency` and spawns up to 8 workers simultaneously, each running an independent WASM instance. Workers coordinate via `SharedArrayBuffer`: the moment one worker finds a match, it signals the others to stop. No wasted cycles.

```
navigator.hardwareConcurrency → workerCount = Math.min(cores, 8)

Worker 1 ─┐
Worker 2 ─┤
Worker 3 ─┤→ first match found → signal via SharedArrayBuffer → all others stop
Worker N ─┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| EVM engine | Rust + WASM | Keypair generation, keccak256, pattern matching |
| Solana engine | Rust + WASM | Ed25519 keypair, Base58 encoding, pattern matching |
| WASM bridge | wasm-bindgen | Rust to JavaScript interface |
| Threading | Web Worker | Parallel brute-force without blocking UI |
| Coordination | SharedArrayBuffer | Zero-overhead worker termination on result |
| Frontend | Next.js + TypeScript | UI and state management |
| Styling | Tailwind CSS | |
| Hosting | Vercel / Cloudflare Pages | Static export, no server required |

---

## Project Structure

```
tunic/
├── engine/
│   ├── Cargo.toml                  # Cargo workspace root
│   ├── evm-engine/
│   │   ├── src/
│   │   │   ├── lib.rs              # WASM entry point
│   │   │   ├── generator.rs        # Brute-force loop
│   │   │   ├── matcher.rs          # Prefix / suffix / combine matching
│   │   │   └── crypto.rs           # secp256k1 keypair + keccak256
│   │   ├── tests/
│   │   │   └── integration_test.rs
│   │   └── Cargo.toml
│   └── solana-engine/
│       ├── src/
│       │   ├── lib.rs
│       │   ├── generator.rs
│       │   ├── matcher.rs          # Case-sensitive Base58 matching
│       │   └── crypto.rs           # Ed25519 keypair + Base58 encoding
│       ├── tests/
│       │   └── integration_test.rs
│       └── Cargo.toml
│
└── frontend/
    ├── src/
    │   ├── app/
    │   │   └── page.tsx
    │   ├── components/
    │   │   ├── InputForm.tsx
    │   │   ├── ResultCard.tsx
    │   │   └── LeetspeakPicker.tsx
    │   ├── hooks/
    │   │   └── useVanityGenerator.ts   # Multi-worker orchestration
    │   ├── workers/
    │   │   ├── evm.worker.ts
    │   │   └── solana.worker.ts
    │   └── lib/
    │       └── leetspeak.ts            # Pure TS leetspeak converter
    ├── public/
    │   └── wasm/
    │       ├── evm/                    # wasm-pack output for EVM
    │       └── solana/                 # wasm-pack output for Solana
    └── package.json
```

---

## Rust Dependencies

### `evm-engine`

| Crate | Purpose |
|---|---|
| `wasm-bindgen` | Rust to JS bridge |
| `k256` | secp256k1 keypair generation |
| `tiny-keccak` | keccak256 hashing |
| `getrandom` (js feature) | CSPRNG in browser environment |
| `serde` + `serde_json` | Serialize result to JS |

### `solana-engine`

| Crate | Purpose |
|---|---|
| `wasm-bindgen` | Rust to JS bridge |
| `ed25519-dalek` | Ed25519 keypair generation |
| `bs58` | Base58 encoding |
| `getrandom` (js feature) | CSPRNG in browser environment |
| `serde` + `serde_json` | Serialize result to JS |

### Workspace `profile.release`

```toml
[profile.release]
opt-level = 3
lto = true
codegen-units = 1
```

---

## Build

### Prerequisites
- Rust + `wasm-pack`
- Node.js + npm

### Build engines

```bash
# EVM engine
wasm-pack build engine/evm-engine --target web --out-dir frontend/public/wasm/evm

# Solana engine (once ready)
wasm-pack build engine/solana-engine --target web --out-dir frontend/public/wasm/solana
```

### Run frontend

```bash
cd frontend
pnpm install
pnpm dev
```

Output is in `frontend/out/`, ready for deployment to Vercel or Cloudflare Pages.

---

## Security

| Concern | Mitigation |
|---|---|
| Private key sent to server | No network requests during generation. Worker and engine have no fetch or XHR calls |
| Weak randomness | `crypto.getRandomValues` via `getrandom` js feature. Never `Math.random()` |
| Private key persisted | Never written to localStorage, sessionStorage, or IndexedDB |
| Supply chain attack | Minimal dependencies, open source, offline usage encouraged |
| UI thread blocked | All brute-force runs inside Web Workers, main thread stays responsive |
| Other workers wasting cycles | SharedArrayBuffer flag stops all workers immediately on first match |

### Private Key Handling
- Displayed once after generation completes
- Cleared from memory when user resets or closes the result
- A non-skippable confirmation is required before the key is revealed
- Never stored anywhere outside of React component state

### Offline Usage
Download the static build, disconnect from the internet, open in browser. Instructions are available on the site. This eliminates any risk of malicious script injection via network.

---

## Roadmap

| Version | Scope |
|---|---|
| V1 | EVM vanity address generator, fully client-side |
| V2 | Solana vanity address generator, Base58 pattern support |
| V3 | ERC-4337 smart wallet, WebAuthn signer, WalletConnect, DeFi connectivity |

---

## Contributing

Tunic is open source. If you find a bug, have a suggestion, or want to contribute, open an issue or pull request on GitHub.

If you find this useful, sharing it on X is appreciated.

---

## License

MIT