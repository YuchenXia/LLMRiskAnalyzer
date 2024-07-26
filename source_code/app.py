from flask import Flask, jsonify, request, render_template, send_file
from agents import BrainstormingAgent
from FEMA_data_model import FMEATable, AiGeneratedContent, AiSuggestion, Cell, Entry


app = Flask(__name__)

@app.route('/')
def index():
    """
    Serve the index page
    """
    # return render_template('index.html')
    return render_template('index.html')


@app.route('/get_fmea_data', methods=['GET'])
def get_fmea_table():
    """
    Endpoint to retrieve the FMEA table data as JSON.
    """
    csv_filename = 'dataset/fmea_example.csv'
    # csv_filename = 'dataset/fmea_example_brake.csv'
    fmea_table = FMEATable.from_csv(csv_filename)
    fmea_json = fmea_table.to_json()
    return fmea_json

@app.route('/add_entry', methods=['POST'])
def add_entry():
    entry_data = request.get_json()
    fmea_data = FMEATable.from_json(entry_data)
    fmea_data.add_entry()
    return fmea_data.to_json()


@app.route('/generate_suggestions', methods=['POST'])
def generate_suggestions():
    data = request.get_json()
    fmea_table = FMEATable.from_json(data['fmea_data'])
    row_index = data['rowIndex']
    cell_key = data['cellKey']
    user_text = data['userText']
    cells_data = data['cellsData']
    suggestions = generate_suggestions_for_cell(fmea_table, row_index, cell_key, user_text, cells_data)

    if 0 <= row_index < len(fmea_table.entries):
        entry = fmea_table.entries[row_index]
        if cell_key in entry.cells:
            ai_content = entry.cells[cell_key].ai_generated_content
            ai_content.suggestions = suggestions
            ai_content.status = "generated"

    return fmea_table.to_json()

def generate_suggestions_for_cell(fmea_table, row_index, cell_key, user_text, cells_data):
    fmea_table_text = fmea_table.to_table_text()
    dict_key_value_text = str({cell_key: fmea_table.entries[row_index].cells[cell_key].value})
    selected_row_text = str(cells_data)
    dict_text = cell_key
    user_text = user_text


    brainstormingAgent = BrainstormingAgent()
    branstorming_output = brainstormingAgent.generate_output(fmea_table=fmea_table_text, dic_key_value=dict_key_value_text, selected_row=selected_row_text, dic=dict_text, user_text= user_text, model='gpt-3.5')

    aiSuggestions = [
        AiSuggestion(branstorming_output["output"][0]["content"], branstorming_output["output"][0]["reason"], branstorming_output["output"][0]["comment"]),
        AiSuggestion(branstorming_output["output"][1]["content"], branstorming_output["output"][1]["reason"], branstorming_output["output"][1]["comment"]),
        AiSuggestion(branstorming_output["output"][2]["content"], branstorming_output["output"][2]["reason"], branstorming_output["output"][2]["comment"]),
        AiSuggestion(branstorming_output["output"][3]["content"], branstorming_output["output"][3]["reason"], branstorming_output["output"][3]["comment"]),
        AiSuggestion(branstorming_output["output"][4]["content"], branstorming_output["output"][4]["reason"], branstorming_output["output"][4]["comment"])
    ]
    return aiSuggestions




@app.route('/add_content_in_the_new_row', methods=['POST'])
def add_content_in_the_new_row():
    print("calling add_new_row_with_content")
    global fmea_data
    data = request.get_json()
    content = data['content']
    index = int(data['cellIndex'])
    print(data)
    print(data['content'])
    fmea_data['table']['rows'][-1]['data'][index]=content

    print(fmea_data)
    return jsonify(fmea_data)  # Return the updated FMEA data


@app.route('/download_fmea_csv', methods=['POST'])
def download_fmea_csv():
    data = request.get_json()
    fmea_table = FMEATable.from_json(data)
    fmea_table.to_csv('fmea_download.csv')  # Save the FMEATable to a CSV file
    try:
        return send_file('fmea_download.csv', as_attachment=True)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run()
