from flask import Flask
from flask import request
from flask_cors import CORS, cross_origin
import submission_module
from submission_module import submission as sub
#except:
  #print("import failed, check syntax")
import importlib
import json

app = Flask(__name__)
CORS(app)

try:
  file = open('info.json', 'r')
  info = json.load(file)
except:
  info = {}

@app.route('/info')
def get_info():
  return info

@app.route('/returns')
def get_returns():
  return info['returns']

@app.route('/sharpe')
def get_sharpe():
  return str(info['sharpe'])

@app.route('/values')
def get_values():
  return info['values']

@app.route('/log')
def get_log():
  return info['log']

submission = "no submission"
@app.route('/submission', methods = ['POST', 'GET'])
@cross_origin()
def get_submission():
    global submission
    if request.method == 'POST':
      submission = request.json['body']
      print(submission)
      run_backtester()
      return submission
    else:
      print(submission)
      return submission

def run_backtester():
  global submission
  global info
  info = {}

  # load in submission
  with open("submission_module/submission.py", "w") as file:
    print("writing file")
    file.write(submission)


  try:
    importlib.reload(submission_module)
  except:
    print("reload failed, check syntax")
    return

  # try:
  sub.run(info)
  # open a file, where you ant to store the data
  file = open('info.json', 'w')
  json.dump(info, file)
  #except:
    # print("failed to run submission, check function parameters")
  

if __name__ == "__main__":
    app.run(debug=True)