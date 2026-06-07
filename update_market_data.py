#!/usr/bin/env python3
import json
import os
import argparse
import datetime

DATA_FILE = "data.json"

def load_data():
    if not os.path.exists(DATA_FILE):
        return {"careers": [], "lastUpdated": ""}
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_data(data):
    data["lastUpdated"] = datetime.datetime.utcnow().isoformat() + "Z"
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"✅ 成功更新 {DATA_FILE}")

def manual_input():
    print("\n--- 💼 新增/更新 职业选项 ---")
    id_val = input("职业ID (如 'medical_writer'): ")
    name = input("职业名称 (如 '医学撰稿人'): ")
    tags = input("核心标签 (以逗号分隔, 如 '稳定,无社交,双休'): ").split(',')
    tags = [t.strip() for t in tags if t.strip()]
    
    print("\n--- 💰 薪资预估 (单位:万元) ---")
    salary_min = int(input("最低年薪: ") or 10)
    salary_max = int(input("最高年薪: ") or 30)
    salary_med = int(input("中位年薪: ") or 20)
    
    print("\n--- 📊 核心属性评分 (0-100) ---")
    social = int(input("社交需求 (0极少-100极多): ") or 50)
    difficulty = int(input("入行难度 (0极易-100极难): ") or 50)
    wlb = int(input("工作生活平衡 (0加班严重-100极度规律): ") or 50)
    quality = int(input("受众人群素质 (0不限-100极高): ") or 50)
    travel = int(input("出差频率 (0不出差-100一直出差): ") or 50)
    growth = int(input("成长潜力 (0天花板低-100极高): ") or 50)
    
    print("\n--- 📝 详细信息 ---")
    desc = input("职业一句话简介: ")
    core = input("核心工作内容: ")
    requirement = input("入行核心门槛: ")
    pros = input("优势(逗号分隔): ").split(',')
    cons = input("劣势(逗号分隔): ").split(',')
    
    new_career = {
        "id": id_val,
        "name": name,
        "tags": tags,
        "salaryMin": salary_min,
        "salaryMax": salary_max,
        "salaryMedian": salary_med,
        "attributes": {
            "social": social,
            "difficulty": difficulty,
            "wlb": wlb,
            "quality": quality,
            "travel": travel,
            "growth": growth
        },
        "description": desc,
        "details": {
            "core": core,
            "salary": f"{salary_min}-{salary_max}万",
            "requirement": requirement
        },
        "pros": [p.strip() for p in pros if p.strip()],
        "cons": [c.strip() for c in cons if c.strip()]
    }
    
    data = load_data()
    # Check if exists
    for i, c in enumerate(data['careers']):
        if c['id'] == id_val:
            data['careers'][i] = new_career
            print(f"🔄 更新已存在的职业: {name}")
            save_data(data)
            return
            
    data['careers'].append(new_career)
    print(f"✨ 添加新职业: {name}")
    save_data(data)

def llm_parse_jd(jd_text):
    """
    预留：通过调用大语言模型（如Gemini、ChatGPT）API 自动解析JD文本。
    此处为伪代码示例，您可以填入自己的 API Key 来实现全自动提取。
    """
    print("\n🤖 正在分析职位描述 (JD)...")
    # 示例逻辑：
    # import google.generativeai as genai
    # genai.configure(api_key="YOUR_API_KEY")
    # model = genai.GenerativeModel('gemini-pro')
    # prompt = f"请解析以下 JD 并严格输出上述的 JSON 结构: {jd_text}"
    # response = model.generate_content(prompt)
    # return json.loads(response.text)
    
    print("⚠️ 自动解析功能需要配置 LLM API Key。目前请使用手动模式 (-m)。")

def main():
    parser = argparse.ArgumentParser(description="医师职业转型分析工具 - 数据更新脚本")
    parser.add_argument('-m', '--manual', action='store_true', help="手动输入模式")
    parser.add_argument('-f', '--file', type=str, help="从包含JD文本的文件中自动解析")
    
    args = parser.parse_args()
    
    if args.manual:
        manual_input()
    elif args.file:
        if os.path.exists(args.file):
            with open(args.file, 'r', encoding='utf-8') as f:
                jd_text = f.read()
                llm_parse_jd(jd_text)
        else:
            print(f"❌ 文件 {args.file} 不存在")
    else:
        print("请指定运行模式。使用 -m 进行手动录入，或使用 -f <文件> 解析JD。")
        parser.print_help()

if __name__ == "__main__":
    main()
