#!/usr/bin/env python3
"""Stage short source-derived Business Studies outline candidates, not published notes.

Requires pypdf and the eleven lebs PDFs. Outputs no full chapter text. Candidate
selection and extraction must be reviewed against source pages before use.
"""
import argparse, hashlib, json, logging, re
from pathlib import Path
from pypdf import PdfReader

logging.getLogger('pypdf').setLevel(logging.ERROR)
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'tools/extract/staging/business-studies-en.json'
# Titles, candidate section labels, selected textbook key terms, and an exact
# opening phrase from the book's own summary. Labels are verified against text.
SPECS = {
 'lebs101': ('Nature and Significance of Management', ['Management','Objectives of Management','Importance of Management','Management as an Art','Management as a Science','Management as a Profession','Levels of Management','Functions of Management','Coordination'], ['Management','Efficiency','Effectiveness','Planning','Organising','Staffing','Directing','Controlling','Coordination'], 'Management is the process of planning'),
 'lebs102': ('Principles of Management', ['Principles of Management','Nature of Principles of Management','Significance of Principles of Management','Scientific Management','Fayol','Taylor'], ['Functional Foremanship','Time Study','Motion Study','Fatigue Study','Method Study','Mental Revolution','Unity of Command','Unity of Direction','Scalar Chain'], 'Principles of management are general guidelines'),
 'lebs103': ('Business Environment', ['Business Environment','Importance of Business Environment','Dimensions of Business Environment','Economic Environment','Social Environment','Technological Environment','Political Environment','Legal Environment','Demonetisation'], ['Business environment','Opportunities','Threats','Economic Environment','Political environment','Social environment','Technological environment','Legal environment','Liberalisation','Privatisation','Globalisation'], 'The term business environment means'),
 'lebs104': ('Planning', ['Planning','Importance of Planning','Features of Planning','Limitations of Planning','Planning Process','Types of Plans'], ['Planning','Objectives','Goals','Decisions','Standards','Controlling','Premises','Assumptions','Alternatives','Strategy','Policy','Procedure','Rule','Programme','Budget'], 'Planning is deciding in advance'),
 'lebs105': ('Organising', ['Organising','Organising Process','Importance of Organising','Organisational Structure','Functional Structure','Divisional Structure','Formal Organisation','Informal Organisation','Delegation','Decentralisation'], ['Organising','Organisational structure','Departmentalisation','Delegation','Authority','Responsibility','Accountability','Functional structure','Divisional structure','Formal organisation','Informal organisation','Span of management','Centralisation','Decentralisation'], 'Organising is the process of defining'),
 'lebs106': ('Staffing', ['Staffing','Importance of Staffing','Staffing Process','Recruitment','Selection','Training and Development'], ['Staffing','Personnel Management','Human Resource Management','Recruitment','Selection','Training','Development','Performance Appraisal','Assessment Tests'], 'Staffing has been described as the managerial function'),
 'lebs107': ('Directing', ['Directing','Importance of Directing','Principles of Directing','Supervision','Motivation','Leadership','Communication'], ['Directing','Supervision','Motives','Motivation','Incentives','Self actualisation','Leadership','Communication','Encoding','Decoding','Feedback','Formal communication','Informal communication'], 'Directing is a complex managerial function'),
 'lebs108': ('Controlling', ['Controlling','Importance of Controlling','Limitations of Controlling','Planning and Controlling','Controlling Process','Techniques of Managerial Control'], ['Controlling','Critical point control','Management by exception','Breakeven analysis','Budgetary control','Return on investment','Ratio analysis','Responsibility accounting','Management audit','PERT and CPM'], 'Controlling is the process of ensuring'),
 'lebs201': ('Financial Management', ['Financial Management','Financial Decisions','Financial Planning','Capital Structure','Fixed Capital','Working Capital'], ['Financial Management','Wealth Maximisation','Investment Decision','Financing Decision','Dividend Decision','Capital Budgeting','Working Capital','Financial Planning','Capital Structure','Trading on Equity'], 'Financial Management is concerned with optimal'),
 'lebs202': ('Marketing', ['Marketing','Marketing Management','Functions of Marketing','Marketing Mix','Product','Price','Place','Promotion','Advertising','Personal Selling','Sales Promotion','Public Relations'], ['Marketing','Labelling','Marketing Management','Marketing Mix','Channels of Distribution','Physical Distribution','Publicity','Consumer Product','Sales Promotion','Promotion Mix','Personal Selling','Public relations','Brand'], 'the term marketing has been described as performance'),
 'lebs203': ('Consumer Protection', ['Consumer Protection','Importance of Consumer Protection','Consumer Rights','Consumer Responsibilities','Ways and Means of Consumer Protection','Redressal Agencies'], ['Consumer protection','Consumer Rights','Consumer Responsibilities','Redressal mechanism','Mediation'], 'From the point of consumers, consumer protection is important'),
}

# Section headings and 1-based PDF pages checked against the original layout.
# Lists are deliberately limited to the principal headings, not every subheading.
HEADINGS = {
 'lebs101': [('Concept',4),('Characteristics of Management',5),('Objectives of Management',9),('Importance of Management',11),('Nature of Management',12),('Management as an Art',12),('Management as a Science',13),('Management as a Profession',16),('Levels of Management',17),('Functions of Management',19),('Coordination — The Essence of Management',21),('Characteristics of Coordination',22),('Importance of Coordination',23)],
 'lebs102': [('Principles of Management: The Concept',3),('Nature of Principles of Management',4),('Significance of Principles of Management',8),('Taylor’s Scientific Management',10),('Principles of Scientific Management',13),('Techniques of Scientific Management',18),('Fayol’s Principles of Management',23),('Fayol Versus Taylor — A Comparison',33)],
 'lebs103': [('Meaning of Business Environment',2),('Importance of Business Environment',4),('Dimensions of Business Environment',6),('Economic Environment in India',13)],
 'lebs104': [('Concept',2),('Importance of Planning',3),('Features of Planning',5),('Limitations of Planning',7),('Planning Process',8),('Types of Plans',11)],
 'lebs105': [('Meaning',2),('Steps in the Process of Organising',3),('Importance of Organising',4),('Organisation Structure',6),('Types of Organisation Structures',7),('Formal and Informal Organisation',13),('Informal Organisation',15),('Delegation',17),('Importance of Delegation',20),('Decentralisation',22)],
 'lebs106': [('Meaning',2),('Importance of Staffing',2),('Evolution of Human Resource Management',5),('Staffing Process',5),('Recruitment',10),('Selection',16),('Training and Development',21),('Training Methods',23),('On the Job Methods',23),('Off the Job Methods',24)],
 'lebs107': [('Meaning',2),('Importance of Directing',3),('Principles of Directing',4),('Elements of Direction',5),('Supervision',5),('Motivation',7),('Leadership',16),('Communication',19),('Formal and Informal Communciation',23)],
 'lebs108': [('Meaning of Controlling',1),('Importance of Controlling',2),('Limitations of Controlling',3),('Relationship between Planning and Controlling',5),('Controlling Process',5)],
 'lebs201': [('Meaning of Business Finance',2),('Financial Management',2),('Objectives',3),('Financial Decisions',4),('Financial Planning',10),('Capital Structure',12),('Fixed and Working Capital',18),('Working Capital',20),('Factors Affecting the Working Capital Requirements',21)],
 'lebs202': [('Marketing Management',5),('Marketing Management Philosophies',7),('Functions of Marketing',10),('Marketing Mix',13),('Products',15),('Consumer Products',16),('Durability of Products',17),('Industrial Products',18),('Branding',20),('Packaging',21),('Pricing',25),('Physical Distribution',28),('Promotion',30),('Promotion Mix',30),('Advertising',31),('Personal Selling',33),('Sales Promotion',36),('Public Relations',38)],
 'lebs203': [('Importance of Consumer Protection',2),('The Consumer Protection Act, 2019',5),('Who is a Consumer?',5),('Consumer Rights',6),('Consumer Responsibilities',8),('Ways and Means of Consumer Protection',9),('Redressal Agencies Under the Consumer Protection Act',11)],
}

def normal(s):
    return re.sub(r'[^a-z0-9]', '', s.lower())

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--pdf-dir', required=True); args=ap.parse_args()
    result = {'subject':'Business Studies','language':'en','status':'source-derived candidates; not reviewed or board-verified; not student-facing', 'chapters':{}}
    for stem,(title,section_candidates,terms,summary_start) in SPECS.items():
        pdf=Path(args.pdf_dir)/(stem+'.pdf'); reader=PdfReader(pdf)
        pages=[p.extract_text() or '' for p in reader.pages]
        if any(not p.strip() for p in pages): raise ValueError(f'{stem}: empty page')
        normalpages=[normal(p) for p in pages]
        def location(s):
            return next((i+1 for i,p in enumerate(normalpages) if normal(s) in p), None)
        objectives=[]
        first=pages[0]; start=re.search(r'(?is)after studying\s+this\s+chapter.*?able to\s*:', first)
        if not start: raise ValueError(f'{stem}: objectives not located')
        for m in re.finditer(r'(?m)^\s*(?:n|¾)\s+([^\n].*?)(?<!viz)([;.])(?=\s|$)', first[start.end():], re.S):
            text=re.sub(r'\s+', ' ',m.group(1)).strip()
            text=text.replace('non- financial','non-financial').replace('descr ibe','describe').replace('func tions','functions').replace('selli ng','selling')
            text=re.sub(r'\s*;?\s+and$', '', text, flags=re.I)
            if len(text) <= 200 and re.match(r'(?i)^(describe|explain|appreciate|state|discuss|examine|analyse|analyze|identify|identity|define|establish|understand|list|distinguish|classify|briefly)\b',text): objectives.append(text.rstrip(';')+'.')
        sections=[{'title':heading,'page':page} for heading,page in HEADINGS[stem]]
        for item in sections:
            if normal(item['title']) not in normalpages[item['page']-1]:
                raise ValueError(f"{stem}: heading missing on page {item['page']}: {item['title']}")
        # Each selected term is checked in the text; case is presentation only.
        keywords=[s for s in terms if location(s)]
        summary=None; summary_page=None
        summary_pages={'lebs101':26, 'lebs102':35, 'lebs103':19, 'lebs104':15, 'lebs105':27, 'lebs106':25, 'lebs107':30, 'lebs108':10, 'lebs201':23, 'lebs202':42, 'lebs203':14}
        for i,page in enumerate(pages):
            if i+1 != summary_pages[stem]: continue
            flat=re.sub(r'\s+',' ',page)
            m=re.search(re.escape(summary_start)+r'[^.!?]{0,280}[.!?]',flat,re.I)
            if m: summary=m.group().strip(); summary_page=i+1; break
        if not objectives or not sections or not keywords or not summary: raise ValueError(f'{stem}: incomplete: objectives={len(objectives)}, sections={len(sections)}, terms={len(keywords)}, summary={summary!r}')
        result['chapters'][stem]={'source':pdf.name,'sha256':hashlib.sha256(pdf.read_bytes()).hexdigest(),'pages':len(pages),'title':title,'sections':sections,'objectives':objectives,'summary_excerpt':summary,'summary_page':summary_page,'key_terms':keywords}
        print(stem, len(sections),len(objectives),len(keywords),'summary',summary_page)
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('wrote',OUT)
if __name__=='__main__': main()
