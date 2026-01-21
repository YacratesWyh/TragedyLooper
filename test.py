'''
Author: cyanocitta
Date: 2026-01-21 14:34:23
LastEditTime: 2026-01-21 14:38:06
FilePath: \tragedylooper\test.py
Description: 
'''
"""
GPT API 连接测试
"""
import os

# API key 应该从环境变量读取，不要硬编码！
# 设置方式: set OPENAI_API_KEY=your-key-here (Windows)
# 或: export OPENAI_API_KEY=your-key-here (Linux/Mac)

def test_gpt_api():
    """测试 GPT API 是否可用"""
    try:
        from openai import OpenAI
    except ImportError:
        print("❌ 错误: 未安装 openai 库")
        print("   运行: pip install openai")
        return False


    try:
        client = OpenAI(api_key='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')
        
        # 发送最简单的请求测试连接
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Hi"}],
            max_tokens=5
        )
        
        print("✅ GPT API 连接成功!")
        print(f"   模型: {response.model}")
        print(f"   响应: {response.choices[0].message.content}")
        return True
        
    except Exception as e:
        print(f"❌ API 调用失败: {e}")
        return False


if __name__ == "__main__":
    test_gpt_api()
