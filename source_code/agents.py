from llm import gpt_model_call
import json


class BrainstormingAgent:
    def __init__(self):
        self.prompt_template = """You are assisting a risk analysis engineer in performing FMEA analysis. Here is the FMEA table data:
{{fmea_table}}

Now, you should focus on the {{dic_key_value}} in a FEMA entry {{selected_row}}. 
The user is editing the entry with the key "{{dic}}", and he/she has entered "{{user_text}}", you shall help to complete it.
Please brainstorm and provide 5 variants, possibly addressing different possible aspects, and generate a concise reason and a concise comment for each one.

You should provide the output in JSON format using the following template:
Output template:
{"output":[{"reason": "a_different_aspect", "content": "a_similar_but_different_content", "comment": "a_concise_explanation"},
{"reason": "a_different_aspect", "content": "a_similar_but_different_content", "comment": "a_concise_explanation"},
{"reason": "a_different_aspect", "content": "a_similar_but_different_content", "comment": "a_concise_explanation"},
{"reason": "a_different_aspect", "content": "a_similar_but_different_content", "comment": "a_concise_explanation"},
{"reason": "a_different_aspect", "content": "a_similar_but_different_content", "comment": "a_concise_explanation"}]}

You should now complete the output with the template:
Output: """

    def generate_output(self, fmea_table, dic_key_value, selected_row, user_text, dic, model='Mixtral-8x22B'): # alternative model: 'gpt-3.5/4'
        self.prompt_filled = self.prompt_template.replace("{{fmea_table}}", fmea_table)
        self.prompt_filled = self.prompt_filled.replace("{{dic_key_value}}", dic_key_value)
        self.prompt_filled = self.prompt_filled.replace("{{selected_row}}", selected_row)
        self.prompt_filled = self.prompt_filled.replace("{{dic}}", dic)
        self.prompt_filled = self.prompt_filled.replace("{{user_text}}", user_text)

        # print(input_text)
        print("***********************")
        print("LLM agent working")
        print("***********************")
        try:
            text_output = gpt_model_call(self.prompt_filled, model=model)
        except Exception as e:
            print(f"Error: {e}")

            return None

        try:
            # Parse the text output into a JSON object
            result_json = json.loads(text_output)
        except json.JSONDecodeError as json_err:
            print(f"JSON Decode Error: {json_err}")
            return None

        # Write the JSON data to a file
        with open('generation_agent.json', 'w') as file:
            json.dump(result_json, file, indent=4)
        return result_json

# Todo: new agent
class CompletingAgent:
    def __init__(self):
        self.prompt_template = """You are assisting a risk analysis engineer in performing FMEA analysis. Here is the FMEA table data:
{{fmea_table}}

Now, you should focus on the {{dic_key_value}} in row {{selected_row}}. 
Please brainstorm and provide 3 alternative items for "{{dic}}", addressing different possible aspects, and generate a concise reason and a concise comment for each one.

You should provide the output in JSON format using the following template:
Output template:
{"output":[{"reason": "a_different_aspect", "content": "a_similar_but_different_content", "comment": "a_concise_explanation"},
{"reason": "a_different_aspect", "content": "a_similar_but_different_content", "comment": "a_concise_explanation"},
{"reason": "a_different_aspect", "content": "a_similar_but_different_content", "comment": "a_concise_explanation"}]}

You should now complete the output with the template:
Output: """

    def generate_output(self, fmea_table, dic_key_value, selected_row, dic, model='gpt-3.5'):
        self.prompt_filled = self.prompt_template.replace("{{fmea_table}}", fmea_table)
        self.prompt_filled = self.prompt_filled.replace("{{dic_key_value}}", dic_key_value)
        self.prompt_filled = self.prompt_filled.replace("{{selected_row}}", selected_row)
        self.prompt_filled = self.prompt_filled.replace("{{dic}}", dic)

        # print(input_text)
        print("***********************")
        print("LLM agent working")
        print("***********************")
        try:
            text_output = gpt_model_call(self.prompt_filled, model=model)
            print(text_output)
        except Exception as e:
            print(f"Error: {e}")

            return None

        try:
            # Parse the text output into a JSON object
            result_json = json.loads(text_output)
            print(result_json)
        except json.JSONDecodeError as json_err:
            print(f"JSON Decode Error: {json_err}")
            return None

        # Write the JSON data to a file
        with open('generation_agent.json', 'w') as file:
            json.dump(result_json, file, indent=4)
        print("Result:\n")
        print(text_output)
        return result_json
