import os
from flask import Flask, render_template, request, jsonify
from sympy import sympify, solve, symbols, lambdify, pi, E, deg
import numpy as np
import matplotlib.pyplot as plt

app = Flask(__name__)
x = symbols('x')
memory = 0.0  # Global memory

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/calculate", methods=["POST"])
def calculate():
    data = request.json
    expr = data.get("expression")
    mode = data.get("mode", "RAD")

    try:
        # Replace UI symbols safely
        expr = expr.replace('π', 'pi').replace('e', 'E')

        # Handle degree mode for trig functions
        if mode == "DEG":
            expr = expr.replace('sin(', 'sin(deg(').replace('cos(', 'cos(deg(').replace('tan(', 'tan(deg(')
            # Close the deg functions
            expr = expr.replace(')', '))')

        result = sympify(expr).evalf()

        # Clean output
        if result == int(result):
            result = int(result)
        else:
            result = round(float(result), 6)

        return jsonify({"result": str(result)})

    except Exception as e:
        print("ERROR:", e)
        return jsonify({"result": "Error"})
    
    
@app.route("/plot", methods=["POST"])
def plot():
    expr = request.json.get("expression")
    try:
        sym_expr = sympify(expr.replace('π', str(pi)).replace('e', str(E)))
        func = lambdify(x, sym_expr, "numpy")
        x_vals = np.linspace(-10, 10, 400)
        y_vals = func(x_vals)
        plt.figure(figsize=(8,4))
        plt.plot(x_vals, y_vals)
        plt.grid(True, alpha=0.3)
        plot_path = os.path.join(app.static_folder or 'static', "plot.png")
        plt.savefig(plot_path, dpi=100, bbox_inches='tight')
        plt.close()
        return jsonify({"image": "/static/plot.png"})
    except:
        return jsonify({"image": None})

@app.route("/solve", methods=["POST"])
def solve_equation():
    expr = request.json.get("expression")
    try:
        # Handle equations like x^2 = 4
        if '=' in expr:
            left, right = expr.split('=', 1)
            equation = sympify(left) - sympify(right)
        else:
            equation = sympify(expr)
        result = solve(equation, x)
        return jsonify({"result": str(result)})
    except:
        return jsonify({"result": "Error"})

@app.route("/memory", methods=["POST"])
def memory_op():
    global memory
    op = request.json.get("op")
    val = float(request.json.get("value", 0))
    if op == "M+": memory += val
    elif op == "M-": memory -= val
    elif op == "MR": return jsonify({"result": str(memory)})
    elif op == "MC": memory = 0
    return jsonify({"result": "OK"})

if __name__ == "__main__":
    os.makedirs('static', exist_ok=True)
    app.run(debug=True)