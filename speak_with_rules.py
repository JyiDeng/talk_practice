import random
import itertools
from typing import Dict, List, Iterable, Tuple


# =========================
# 1. 词库：你可以不断往里面加
# =========================
WORD_BANK: Dict[str, List[str]] = {
    "greeting": [
        "Hi", "Hey", "Hello"
    ],
    "farewell": [
        "Bye", "See you", "See you later", "Take care", "Catch you later"
    ],
    "thanks": [
        "Thanks", "Thank you", "Thank you so much", "I really appreciate it"
    ],
    "response_thanks": [
        "No problem", "You're welcome", "No worries", "Of course"
    ],
    "person": [
        "sir", "ma'am", "my friend", "guys", "everyone"
    ],
    "drink": [
        "water", "coffee", "tea", "iced coffee", "latte", "milk tea", "orange juice", "cola"
    ],
    "food": [
        "a sandwich", "a burger", "a salad", "fried rice", "noodles",
        "grilled chicken", "pizza", "soup", "dumplings", "a bagel"
    ],
    "snack": [
        "chips", "cookies", "chocolate", "ice cream", "a muffin"
    ],
    "dessert": [
        "cake", "cheesecake", "ice cream", "a brownie", "a donut"
    ],
    "place": [
        "the station", "the subway", "the bus stop", "the restroom",
        "the airport", "the hotel", "the front desk", "the mall",
        "the pharmacy", "the supermarket", "the coffee shop", "the restaurant"
    ],
    "shop_item": [
        "this shirt", "this jacket", "this bottle", "this charger",
        "this phone case", "these shoes", "this umbrella", "this backpack"
    ],
    "price_adj": [
        "too expensive", "a little expensive", "pretty cheap", "reasonable"
    ],
    "payment_method": [
        "card", "cash", "Apple Pay", "credit card", "debit card"
    ],
    "direction": [
        "left", "right", "straight", "around the corner", "across the street"
    ],
    "transport": [
        "bus", "subway", "taxi", "train", "streetcar", "Uber"
    ],
    "time_phrase": [
        "right now", "in a minute", "later", "this afternoon", "tomorrow morning", "tonight"
    ],
    "adjective_good": [
        "great", "nice", "pretty good", "amazing", "really good"
    ],
    "adjective_bad": [
        "tired", "busy", "hungry", "lost", "confused", "a bit stressed"
    ],
    "question_word": [
        "where", "when", "why", "how"
    ],
    "clothing_size": [
        "small", "medium", "large"
    ],
    "meal_type": [
        "breakfast", "lunch", "dinner"
    ],
    "seat_type": [
        "window seat", "aisle seat", "table by the window", "quiet seat"
    ],
    "problem": [
        "my phone isn't working",
        "I can't find my hotel",
        "my card didn't go through",
        "I lost my way",
        "I don't understand this"
    ],
    "help_request": [
        "help me", "give me a hand", "show me the way", "explain this to me"
    ],
    "smalltalk_topic": [
        "your day", "work", "school", "the weather", "this place", "the food here"
    ],
    "verb_go": [
        "go", "head", "walk", "get"
    ],
    "verb_buy": [
        "buy", "get", "pick up"
    ],
    "quantity": [
        "one", "two", "three"
    ],
    "polite_opening": [
        "Excuse me", "Sorry", "Hi", "Hey"
    ],
    "feeling": [
        "good", "fine", "okay", "a little tired", "kind of hungry", "not bad"
    ],
    "yes_phrase": [
        "Yes", "Yeah", "Sure", "Of course"
    ],
    "no_phrase": [
        "No", "Not really", "I don't think so"
    ]
}


# ======================================
# 2. 场景模板：模板里的 {xxx} 会被替换
# ======================================
SCENES: Dict[str, List[str]] = {
    "greetings": [
        "{greeting}!",
        "{greeting}, how's it going?",
        "{greeting}, how are you doing?",
        "Nice to meet you.",
        "Nice to see you again.",
        "Long time no see.",
        "What's up?",
        "How have you been?",
        "Good morning.",
        "Good evening."
    ],

    "farewells": [
        "{farewell}.",
        "I gotta go.",
        "I should get going.",
        "See you tomorrow.",
        "Talk to you later.",
        "Take care.",
        "Get home safe.",
        "Keep in touch."
    ],

    "thanks_and_politeness": [
        "{thanks}.",
        "{thanks} for your help.",
        "{response_thanks}.",
        "{polite_opening}, can I ask you something?",
        "{polite_opening}, could you help me?",
        "Sorry to bother you.",
        "Sorry, I didn't catch that.",
        "Could you say that again?",
        "Could you speak a little slower?",
        "My bad."
    ],

    "restaurant": [
        "Can I get {drink}, please?",
        "I'd like {food}, please.",
        "I'll have {food} and {drink}.",
        "What do you recommend?",
        "Do you have anything vegetarian?",
        "Can I get this to go?",
        "For here, please.",
        "Can I get the bill, please?",
        "This is really {adjective_good}.",
        "Could I get another {drink}?"
    ],

    "shopping": [
        "How much is {shop_item}?",
        "I'll take {shop_item}.",
        "Do you have this in {clothing_size}?",
        "Do you have a cheaper one?",
        "This is {price_adj}.",
        "Can I try this on?",
        "Where can I pay?",
        "Can I pay by {payment_method}?",
        "Can I get a receipt?",
        "I'm just looking, thanks."
    ],

    "transportation": [
        "Where is {place}?",
        "How do I get to {place}?",
        "Is it far from here?",
        "Can I walk there?",
        "How long does it take by {transport}?",
        "Should I go {direction}?",
        "Do I need to transfer?",
        "Which {transport} goes there?",
        "I'm trying to get to {place}.",
        "I think I'm lost."
    ],

    "daily_needs": [
        "I need some {drink}.",
        "I need to go to {place}.",
        "I need help with this.",
        "Can I use the restroom?",
        "Do you have Wi-Fi here?",
        "What's the password?",
        "Can I charge my phone here?",
        "Do you have a menu in English?",
        "Can you show me where it is?",
        "I need a minute."
    ],

    "small_talk": [
        "How was your day?",
        "Have you been busy lately?",
        "I'm feeling {feeling}.",
        "Same here.",
        "Really?",
        "No way.",
        "That sounds {adjective_good}.",
        "That's kind of interesting.",
        "What do you think about {smalltalk_topic}?",
        "I've been pretty busy lately."
    ],

    "asking_for_help": [
        "{polite_opening}, can you {help_request}?",
        "{polite_opening}, I need help.",
        "{polite_opening}, {problem}.",
        "Could you show me on the map?",
        "Could you write it down for me?",
        "I don't understand.",
        "Can you explain that again?",
        "I'm not sure what this means.",
        "Could you point me in the right direction?",
        "Can you help me out?"
    ],

    "payment": [
        "I'd like to pay.",
        "Can I pay by {payment_method}?",
        "Do you take {payment_method}?",
        "Can we pay separately?",
        "We'll pay together.",
        "Here's my card.",
        "Do I tap here?",
        "It didn't go through.",
        "Could you try again?",
        "Can I get a receipt, please?"
    ],

    "hotel": [
        "Hi, I'd like to check in.",
        "I have a reservation.",
        "I'd like to check out.",
        "What time is breakfast?",
        "Is breakfast included?",
        "Can I have a {seat_type}?",
        "Could I get a room key?",
        "My room isn't ready yet?",
        "Can I leave my luggage here?",
        "Is there Wi-Fi in the room?"
    ]
}


# ============================================
# 3. 一些更具体的“组合场景”，用于覆盖真实对话
# ============================================
DIALOGUE_PATTERNS: Dict[str, List[Tuple[str, str]]] = {
    "buying_coffee": [
        ("A", "{polite_opening}, can I get {drink}, please?"),
        ("B", "Sure. Anything else?"),
        ("A", "Yes, I'll also have {snack}."),
        ("B", "For here or to go?"),
        ("A", "To go, please."),
        ("B", "That'll be all."),
        ("A", "Can I pay by {payment_method}?"),
    ],

    "asking_direction": [
        ("A", "{polite_opening}, how do I get to {place}?"),
        ("B", "Go {direction}, then keep going straight."),
        ("A", "Is it far?"),
        ("B", "Not really, about ten minutes on foot."),
        ("A", "{thanks}."),
        ("B", "{response_thanks}."),
    ],

    "shopping_clothes": [
        ("A", "{polite_opening}, how much is {shop_item}?"),
        ("B", "It's on sale today."),
        ("A", "Do you have this in {clothing_size}?"),
        ("B", "Let me check."),
        ("A", "Can I try it on?"),
        ("B", "Of course."),
        ("A", "I'll take it."),
    ],

    "restaurant_order": [
        ("A", "{polite_opening}, I'd like {food} and {drink}, please."),
        ("B", "Sure. Anything else?"),
        ("A", "Maybe {dessert}."),
        ("B", "For here or to go?"),
        ("A", "For here."),
        ("B", "No problem."),
    ]
}


# ======================================
# 4. 模板替换核心
# ======================================
class SentenceGenerator:
    def __init__(self, word_bank: Dict[str, List[str]], scenes: Dict[str, List[str]]):
        self.word_bank = word_bank
        self.scenes = scenes

    def _extract_slots(self, template: str) -> List[str]:
        slots = []
        start = 0
        while True:
            left = template.find("{", start)
            if left == -1:
                break
            right = template.find("}", left)
            if right == -1:
                break
            slots.append(template[left + 1:right])
            start = right + 1
        return slots

    def fill_template_random(self, template: str) -> str:
        result = template
        for slot in self._extract_slots(template):
            values = self.word_bank.get(slot)
            if not values:
                raise ValueError(f"词库里没有槽位: {slot}")
            result = result.replace("{" + slot + "}", random.choice(values), 1)
        return result

    def fill_template_all(self, template: str, max_outputs: int = 50) -> List[str]:
        slots = self._extract_slots(template)
        if not slots:
            return [template]

        values_list = []
        for slot in slots:
            values = self.word_bank.get(slot)
            if not values:
                raise ValueError(f"词库里没有槽位: {slot}")
            values_list.append(values)

        all_sentences = []
        for combo in itertools.product(*values_list):
            result = template
            for slot, val in zip(slots, combo):
                result = result.replace("{" + slot + "}", val, 1)
            all_sentences.append(result)
            if len(all_sentences) >= max_outputs:
                break
        return all_sentences

    def generate_scene_random(self, scene_name: str, n: int = 10) -> List[str]:
        if scene_name not in self.scenes:
            raise ValueError(f"没有这个场景: {scene_name}")
        templates = self.scenes[scene_name]
        return [self.fill_template_random(random.choice(templates)) for _ in range(n)]

    def generate_scene_all(self, scene_name: str, per_template_limit: int = 20) -> List[str]:
        if scene_name not in self.scenes:
            raise ValueError(f"没有这个场景: {scene_name}")
        outputs = []
        for template in self.scenes[scene_name]:
            outputs.extend(self.fill_template_all(template, max_outputs=per_template_limit))
        return outputs

    def generate_all_scenes(self, per_scene: int = 20) -> Dict[str, List[str]]:
        result = {}
        for scene_name in self.scenes:
            result[scene_name] = self.generate_scene_random(scene_name, n=per_scene)
        return result


# ======================================
# 5. 对话生成器
# ======================================
class DialogueGenerator:
    def __init__(self, word_bank: Dict[str, List[str]], dialogue_patterns: Dict[str, List[Tuple[str, str]]]):
        self.word_bank = word_bank
        self.dialogue_patterns = dialogue_patterns
        self.sentence_generator = SentenceGenerator(word_bank, {})

    def generate_dialogue(self, pattern_name: str) -> List[str]:
        if pattern_name not in self.dialogue_patterns:
            raise ValueError(f"没有这个对话场景: {pattern_name}")

        dialogue = []
        for speaker, template in self.dialogue_patterns[pattern_name]:
            line = self.sentence_generator.fill_template_random(template)
            dialogue.append(f"{speaker}: {line}")
        return dialogue


# ======================================
# 6. 导出到文本文件
# ======================================
def save_sentences_to_file(filename: str, data: Dict[str, List[str]]) -> None:
    with open(filename, "w", encoding="utf-8") as f:
        for scene_name, sentences in data.items():
            f.write(f"===== {scene_name} =====\n")
            for i, sentence in enumerate(sentences, start=1):
                f.write(f"{i}. {sentence}\n")
            f.write("\n")


def save_dialogues_to_file(filename: str, dialogues: Dict[str, List[str]]) -> None:
    with open(filename, "w", encoding="utf-8") as f:
        for name, lines in dialogues.items():
            f.write(f"===== {name} =====\n")
            for line in lines:
                f.write(line + "\n")
            f.write("\n")


# ======================================
# 7. 主函数：示例运行
# ======================================
def main() -> None:
    sentence_gen = SentenceGenerator(WORD_BANK, SCENES)
    dialogue_gen = DialogueGenerator(WORD_BANK, DIALOGUE_PATTERNS)

    print("可用场景：")
    for name in SCENES.keys():
        print("-", name)

    print("\n随机生成 greetings 场景 10 句：")
    for s in sentence_gen.generate_scene_random("greetings", n=10):
        print(s)

    print("\n随机生成 restaurant 场景 10 句：")
    for s in sentence_gen.generate_scene_random("restaurant", n=10):
        print(s)

    print("\n生成 buying_coffee 对话：")
    coffee_dialogue = dialogue_gen.generate_dialogue("buying_coffee")
    for line in coffee_dialogue:
        print(line)

    # 导出所有场景
    all_scene_sentences = sentence_gen.generate_all_scenes(per_scene=30)
    save_sentences_to_file("daily_english_sentences.txt", all_scene_sentences)

    # 导出所有对话
    all_dialogues = {}
    for pattern_name in DIALOGUE_PATTERNS:
        all_dialogues[pattern_name] = dialogue_gen.generate_dialogue(pattern_name)
    save_dialogues_to_file("daily_english_dialogues.txt", all_dialogues)

    print("\n已导出：")
    print("- daily_english_sentences.txt")
    print("- daily_english_dialogues.txt")


if __name__ == "__main__":
    main()