import csv

def convert_csv_to_json(csv_file_path):
    fmea_data = {
        "table": {
            "header": [],
            "rows": []
        }
    }

    with open(csv_file_path, newline='', encoding='utf-8-sig') as csvfile:
        reader = csv.reader(csvfile, delimiter=';')
        headers = next(reader)  # Assume the first row contains headers
        fmea_data["table"]["header"] = headers

        for row in reader:
            details_list = [[{"content": "", "reason": "", "comment": ""}] for _ in range(14)]  # Additional empty entries

            # Create a row dictionary per your JSON structure requirements
            fmea_data["table"]["rows"].append({
                "data": row,  # Add row ID if not included in CSV
                "details": details_list
            })


    return fmea_data


def convert_json_to_csv_text(json_data):
    # Extract headers and rows from JSON data
    header = json_data['table']['header']
    rows = json_data['table']['rows']
    text_header = ""+str(header)
    rows= [row['data'] for row in rows]
    text_rows = "\n".join([str(row) for row in rows])
    text = text_header + "\n"+ text_rows
    return text



def add_new_row_to_fmea_data(fmea_data, row_id=""):
    # Append a new row to the existing rows list
    fmea_data["table"]["rows"].append({
        "data": [row_id, '', '', '', '', '', '', '', '', '','', '', '', ''],  # Add row ID if not included in CSV
        "details": [[{"content": "", "reason": "", "comment": ""}]for _ in range(14)]
    })
    return fmea_data




if __name__ == "__main__":
    pass



# example:
# fmea_data_old = {
#     "table": {
#         "header": ["ID","Item-Function", "Potential Failure Mode", "Potential Effects of Failure", "Severity",
#                    "Potential Causes", "Occurrence", "Current Controls", "Detection", "RPN", "Recommended Actions",
#                    "Responsible", "Actions Taken", "New RPN"],
#         "rows": [
#             {
#                 "data": ["1", "Example Item", "Example Failure Mode", "Example Effect", 10, "Example Cause", 5,
#                          "Example Control", 8, 400, "Example Action", "Dep. A", "Completed", 200],
#                 "details": [[
#                     {"content": "", "reason": "", "comment": ""},
#                     {"content": "content_1", "reason": "reason_1", "comment": "comment_1"},
#                     {"content": "content_2", "reason": "reason_2", "comment": "comment_2"},
#                     {"content": "content_3", "reason": "reason_3", "comment": "comment_3"}],
#                     [{"content": "", "reason": "", "comment": ""}],
#                     [{"content": "", "reason": "", "comment": ""}],
#                     [{"content": "", "reason": "", "comment": ""}],
#                     [{"content": "", "reason": "", "comment": ""}],
#                     [{"content": "", "reason": "", "comment": ""}],
#                     [{"content": "", "reason": "", "comment": ""}],
#                     [{"content": "", "reason": "", "comment": ""}],
#                     [{"content": "", "reason": "", "comment": ""}],
#                     [{"content": "", "reason": "", "comment": ""}],
#                     [{"content": "", "reason": "", "comment": ""}],
#                     [{"content": "", "reason": "", "comment": ""}],
#                     [{"content": "", "reason": "", "comment": ""}]
#                 ]
#             },
#             {
#                 "data": ["2", "Example Item", "Example Failure Mode", "Example Effect", 10, "Example Cause", 5,
#                          "Example Control", 8, 400, "Example Action", "Dep. A", "Completed", 200],
#                 "details": [[
#                     {"content": "", "reason": "", "comment": ""},
#                     {"content": "content_1", "reason": "reason_1", "comment": "comment_1"},
#                     {"content": "content_2", "reason": "reason_2", "comment": "comment_2"},
#                     {"content": "content_3", "reason": "reason_3", "comment": "comment_3"}],
#                     [{"content": "", "reason": "", "comment": ""}],
#                     [{"content": "", "reason": "", "comment": ""}],
#                     [{"content": "", "reason": "", "comment": ""}],
#                     [{"content": "", "reason": "", "comment": ""}],
#                     [{"content": "", "reason": "", "comment": ""}],
#                     [{"content": "", "reason": "", "comment": ""}],
#                     [{"content": "", "reason": "", "comment": ""}],
#                     [{"content": "", "reason": "", "comment": ""}],
#                     [{"content": "", "reason": "", "comment": ""}],
#                     [{"content": "", "reason": "", "comment": ""}],
#                     [{"content": "", "reason": "", "comment": ""}],
#                     [{"content": "", "reason": "", "comment": ""}]
#                 ]
#             }
#         ]
#     }
# }
