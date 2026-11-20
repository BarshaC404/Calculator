# Prototype link
https://calculator.barshachangdar.workers.dev/


# Glass Scientific Calculator

A responsive scientific calculator with a warm brown, water-drop glass design. It is built with plain **HTML, CSS and JavaScript**, with no frameworks and no libraries, and it was made as part of my internship project.

> Add a screenshot or GIF here after you push, for example:
> `![Calculator preview](screenshot.png)`

## Features

**Calculator**
- Basic operations: `+`, `−`, `×`, `÷`, `%`, decimals, parentheses
- Trigonometry: `sin`, `cos`, `tan` and the inverses `sin⁻¹`, `cos⁻¹`, `tan⁻¹` (through the **2nd** key)
- Logarithms and exponents: `ln`, `log`, `eˣ`, `10ˣ`, `xʸ`, `x²`, `x³`
- Roots and others: `√x`, `∛x`, `1/x`, `|x|`, `n!`
- Constants: `π`, `e`
- `Ans` key to reuse the last result, plus memory keys `M+` and `MR`
- **Deg / Rad** toggle
- Implicit multiplication, so `2π` and `3(4+1)` work
- Live result preview while typing, with open brackets closed automatically
- Clear error messages, such as "Cannot divide by zero"

**History**
- Every calculation is saved with its date and time
- Saved in the browser (`localStorage`), so it is still there after a refresh
- Tap an entry to reuse its result
- **Back**, **Refresh** and **Clear** buttons

**Design and interface**
- Glassmorphism look with a warm, light brown palette
- Animated water drops in the background that you can drag and throw; they get a push every time you press `=`
- After a calculation, the result becomes larger and bold
- Two modes: **Compact** and **Full screen**, with a switch button
- Responsive for phones, tablets and desktops, in portrait and landscape
- Keyboard support
- Respects the "reduce motion" setting of the device

## Project structure

```
.
├── index.html   # page structure: display, history panel and key layout
├── style.css    # glass and water-drop styling, full screen mode, responsive rules
├── script.js    # calculation engine, history, modes and background animation
└── README.md
```

## Getting started

No installation or build step is needed.

1. Clone the repository
   ```bash
   git clone https://github.com/<your-username>/<your-repo-name>.git
   cd <your-repo-name>
   ```
2. Open `index.html` in any modern browser.

If your browser blocks `localStorage` for files opened directly from disk, history won't survive a refresh. In that case, serve the folder locally, for example with the **Live Server** extension in VS Code, or:

```bash
python -m http.server 8000
```

then open `http://localhost:8000`.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `0-9` `.` | Enter numbers |
| `+` `-` `*` `/` | Add, subtract, multiply, divide |
| `^` `!` `%` `(` `)` | Power, factorial, percent, brackets |
| `Enter` or `=` | Calculate |
| `Backspace` | Delete the last character |
| `Esc` | Clear all (or close the history panel when it is open) |
| `p` | Insert π |

## How it works

- **No `eval()`.** Expressions are processed by a small tokenizer and a recursive-descent parser written for this project. This keeps the calculator safe and gives the correct order of operations, with powers before multiplication and division before addition.
- **Exact trigonometry in degree mode.** Values at clean angles, such as `sin(30)` or `cos(90)`, avoid floating-point noise.
- **Input checks.** Division by zero, invalid factorials, `log` of non-positive numbers and similar cases show a readable message instead of `NaN` or `Infinity`.
- **Background animation.** The water drops are moved with `requestAnimationFrame`, and pointer events handle dragging on both mouse and touch.

## Browser support

Works in current versions of Chrome, Edge, Firefox and Safari, on desktop and mobile. The glass effect uses `backdrop-filter`. The effect is lighter on small screens for better performance. On iPhone the Full screen button uses the full-window layout, because iOS Safari does not support the browser Fullscreen API.

## What I learned

- Building a safe expression parser instead of relying on `eval()`
- Glassmorphism with CSS gradients, `backdrop-filter` and layered shadows
- Responsive design with media queries, CSS Grid and safe-area insets for phones
- Saving data in the browser with `localStorage`
- Handling mouse and touch input with Pointer Events

## Possible improvements

- Hyperbolic functions (`sinh`, `cosh`, `tanh`)
- More memory keys (`M−`, `MC`)
- Export history as a file
- Theme switcher (light and dark)

## Author

**Your Name**
GitHub: [@BarshaC404](https://github.com/BarshaC404)

## License

This project is open source. Add a license of your choice, for example MIT, if you want others to reuse it.
