import zipfile
import xml.etree.ElementTree as ET
import glob
import os

def inspect_all():
    files = sorted(glob.glob("KUBWA_TABLE VIEW/*.xlsx"))
    print(f"Total files: {len(files)}")
    for file_path in files:
        fname = os.path.basename(file_path)
        with zipfile.ZipFile(file_path, 'r') as z:
            shared_strings = []
            if 'xl/sharedStrings.xml' in z.namelist():
                tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
                for si in tree.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
                    text_parts = [elem.text for elem in si.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t') if elem.text]
                    shared_strings.append(''.join(text_parts))

            tree = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
            rows = tree.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row')
            
            # extract header row (row 1)
            headers = []
            if rows:
                for c in rows[0].findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                    t = c.get('t')
                    v = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                    val = v.text if v is not None and v.text is not None else ''
                    if t == 's' and shared_strings and val.isdigit():
                        val = shared_strings[int(val)]
                    headers.append(val)
            print(f"{fname:<28} | Rows: {len(rows):<5} | Headers: {headers}")

inspect_all()
