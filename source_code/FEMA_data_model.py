import csv
import json
from datetime import datetime

# Define the data model classes
# Conversion between JSON and Object
# JSON -> Object: FMEATable.from_json(json_data)
# Object -> JSON: fmea_table.to_json()

# Conversion between CSV and Object
# CSV -> Object: FMEATable.from_csv(csv_filename)
# Object -> CSV: fmea_table.to_csv(csv_filename)

class AiSuggestion:
    def __init__(self, content="", reason="", comment=""):
        self.content = content
        self.reason = reason
        self.comment = comment

    @classmethod
    def from_dict(cls, data):
        return cls(content=data.get('content', ''),
                   reason=data.get('reason', ''),
                   comment=data.get('comment', ''))

    def to_dict(self):
        return {"content": self.content, "reason": self.reason, "comment": self.comment}

class AiGeneratedContent:
    def __init__(self, status="", suggestions=None):
        self.status = status
        self.suggestions = suggestions if suggestions is not None else []

    @classmethod
    def from_dict(cls, data):
        suggestions = [AiSuggestion.from_dict(s) for s in data.get('suggestions', [])]
        return cls(status=data.get('status', ''), suggestions=suggestions)

    def to_dict(self):
        return {"status": self.status, "suggestions": [s.to_dict() for s in self.suggestions]}

class Cell:
    def __init__(self, value="", ai_generated_content=None):
        self.value = value
        self.ai_generated_content = ai_generated_content if ai_generated_content is not None else AiGeneratedContent()

    @classmethod
    def from_dict(cls, data):
        ai_generated_content = AiGeneratedContent.from_dict(data.get('aiGeneratedContent', {}))
        return cls(value=data.get('value', ''), ai_generated_content=ai_generated_content)

    def to_dict(self):
        return {"value": self.value, "aiGeneratedContent": self.ai_generated_content.to_dict()}

class Entry:
    def __init__(self, entry_id=""):
        self.entry_id = entry_id
        self.cells = {}

    @classmethod
    def from_dict(cls, data):
        entry = cls(entry_id=data.get('entryId', ''))
        entry.cells = {name: Cell.from_dict(cell_data) for name, cell_data in data.get('cells', {}).items()}
        return entry

    def to_dict(self):
        return {"entryId": self.entry_id, "cells": {name: cell.to_dict() for name, cell in self.cells.items()}}

    def simplified_entry_dict(self):
        # 返回一个字典，其中只包括entryId和cells的值
        simple_dict = {"entryId": self.entry_id}
        simple_cells = {}
        for name, cell in self.cells.items():
            simple_cells[name] = cell.value  # 只获取value部分
        simple_dict["cells"] = simple_cells
        return simple_dict

    def add_empty(self):
        # Assume the structure of cells is known as per the provided content example
        cell_names = [
            "FMEA_ID", "itemFunction", "failureMode", "effectsOfFailure",
            "severity", "potentialCauses", "occurrence", "currentControls",
            "detection", "rpn", "recommendedActions", "responsible",
            "actionsTaken", "newRpn"
        ]
        for name in cell_names:
            self.cells[name] = Cell(
                value="",
                ai_generated_content=AiGeneratedContent(status="", suggestions=[])
            )

class FMEATable:
    def __init__(self, fmea_id="", project_id="", last_updated=None):
        self.fmea_id = fmea_id
        self.project_id = project_id
        self.last_updated = last_updated if last_updated is not None else datetime.now()
        self.entries = []

    @classmethod
    def from_dict(cls, data):
        table = cls(fmea_id=data.get('fmeaId', ''),
                    project_id=data.get('projectId', ''),
                    last_updated=datetime.fromisoformat(data.get('lastUpdated')) if data.get('lastUpdated') else None)
        table.entries = [Entry.from_dict(entry_data) for entry_data in data.get('entries', [])]
        return table

    def add_entry(self):
        new_entry = Entry()
        new_entry.add_empty()  # Populate the new entry with empty cells
        self.entries.append(new_entry)

    def to_dict(self):
        # 将对象转换为可以序列化的字典
        return {
            "fmeaId": self.fmea_id,
            "projectId": self.project_id,
            "lastUpdated": self.last_updated.isoformat() if isinstance(self.last_updated, datetime) else self.last_updated,
            "entries": [entry.to_dict() for entry in self.entries]
        }

    def to_json(self):
        # 使用自定义的 to_dict 方法进行序列化
        return json.dumps(self.to_dict(), indent=4)

    @classmethod
    def from_json(cls, json_data):
        obj = cls()
        obj.fmea_id = json_data.get('fmeaId', '')
        obj.project_id = json_data.get('projectId', '')
        obj.last_updated = datetime.fromisoformat(json_data.get('lastUpdated')) if json_data.get('lastUpdated') else datetime.now()
        for entry_data in json_data.get('entries', []):
            entry = Entry.from_dict(entry_data)
            obj.entries.append(entry)
        return obj

    def to_csv(self, csv_filename):
        with open(csv_filename, 'w', newline='') as csvfile:
            csvwriter = csv.writer(csvfile, delimiter=';')
            column_names = self.entries[0].cells.keys() if self.entries else []
            csvwriter.writerow(column_names)
            for entry in self.entries:
                csvwriter.writerow([entry.cells[name].value for name in column_names])

    @classmethod
    def from_csv(cls, csv_filename):
        with open(csv_filename, newline='') as csvfile:
            csvreader = csv.reader(csvfile, delimiter=';')
            column_names = next(csvreader)
            obj = cls()
            for row in csvreader:
                entry = Entry()
                for cell_name, value in zip(column_names, row):
                    ai_gen_content = AiGeneratedContent()
                    cell = Cell(value=value, ai_generated_content=ai_gen_content)
                    entry.cells[cell_name] = cell
                obj.entries.append(entry)
            return obj

    def to_table_text(self):
        # 检查是否有条目，如果没有，返回一个提示消息
        if not self.entries:
            return "No entries available."

        # 获取列标题（即所有单元格的键）
        column_names = self.entries[0].cells.keys() if self.entries else []
        header = " | ".join(column_names)
        lines = [header]  # 包括一个分隔线

        # 遍历每一个条目，获取每个单元格的值
        for entry in self.entries:
            row = " | ".join(entry.cells[name].value for name in column_names)
            lines.append(row)

        return "\n".join(lines)

if __name__ == "__main__":
    csv_filename = "output.csv"
    fmea_table_object = FMEATable.from_csv(csv_filename)
    print(fmea_table_object.to_table_text())

    # csv_filename = "output.csv"
    # fmea_table_object = FMEATable.from_csv(csv_filename)
    # json_output = fmea_table_object.to_json()
    # print(json_output)
    #
    # # 1. 将 JSON 数据保存到文件
    # json_filename = "saved_fmea_data.json"
    # with open(json_filename, 'w') as json_file:
    #     json_file.write(json_output)  # json_output 从之前的 to_json() 获取
    #
    # # 2. 从 JSON 文件读取数据并转化回 FMEATable 对象
    # with open(json_filename, 'r') as json_file:
    #     json_data = json.load(json_file)  # 从文件加载 JSON 数据
    #     fmea_table_from_json = FMEATable.from_json(json_data)  # 转换为 FMEATable 对象
    #
    # # 3. 将 FMEATable 对象保存为 CSV 文件
    # new_csv_filename = "restored_output.csv"
    # fmea_table_from_json.to_csv(new_csv_filename)
    # print(f"数据已从 JSON 转换并保存到新的 CSV 文件: {new_csv_filename}")
