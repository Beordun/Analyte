import zipfile
import xml.etree.ElementTree as ET
import glob
import os

def inspect_xlsx(file_path):
    print(f"\n=================== File: {os.path.basename(file_path)} ===================")
    with zipfile.ZipFile(file_path, 'r') as z:
        # Read shared strings if present
        shared_strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
            for si in tree.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
                t = si.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')
                if t is not None and t.text:
                    shared_strings.append(t.text)
                else:
                    # check for formatted text runs <r><t>
                    text_parts = [elem.text for elem in si.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t') if elem.text]
                    shared_strings.append(''.join(text_parts))

        # Read sheet1.xml
        tree = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
        rows = tree.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row')
        print(f"Total Rows: {len(rows)}")
        
        for r_idx, row in enumerate(rows[:5]):
            cells = []
            for c in row.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                t = c.get('t')
                v = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                if v is not None and v.text is not None:
                    val = v.text
                    if t == 's' and shared_strings:
                        val = shared_strings[int(val)]
                    cells.append(val)
                else:
                    cells.append('')
            print(f"Row {r_idx+1}: {cells[:10]}")

files = glob.glob("KUBWA_TABLE VIEW/*.xlsx")
for f in files[:6]:
    inspect_xlsx(f)
