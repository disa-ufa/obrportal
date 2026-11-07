"""Strict M4 JS import graph rooted only at explicit CI node --test commands."""
from pathlib import Path
import re
import shlex

REQUIRED_TESTS = (
    'mintrud_participant.test.mjs', 'mintrud_signature.test.mjs',
    'own_permissions.test.mjs', 'registry_presentation.test.mjs',
    'session_download.test.mjs', 'admin_mintrud_access.test.mjs',
    'mintrud_scan_retry.test.mjs',
)
M4_MODULES = (
    'components/admin/MintrudParticipantCards.jsx', 'components/admin/MintrudRegistryDetails.jsx',
    'components/admin/MintrudSignaturePanel.jsx', 'hooks/useMintrudPermissions.js',
    'lib/mintrudParticipant.js', 'lib/mintrudSignature.js',
    'pages/OwnMintrudProtocolsPage.jsx', 'utils/registryPresentation.js',
)
TOKEN = re.compile(r"(?P<comment>//[^\n]*|/\*[\s\S]*?\*/)|(?P<string>'(?:\\.|[^'\\])*'|\"(?:\\.|[^\"\\])*\"|`(?:\\.|[^`\\])*`)|(?P<word>[A-Za-z_$][\w$]*)|(?P<punct>[^\s])")
def tokens(source):
    return [(m.lastgroup, m.group()) for m in TOKEN.finditer(source) if m.lastgroup != 'comment']
def imports(source):
    ts = tokens(source); found = []
    for i, (kind, word) in enumerate(ts):
        if kind != 'word': continue
        if word == 'import' and i+1 < len(ts):
            if ts[i+1][0] == 'string': found.append(ts[i+1][1][1:-1])
            else:
                for j in range(i+1, min(i+60, len(ts)-1)):
                    if ts[j][1] == ';': break
                    if ts[j][1] == 'from' and ts[j+1][0] == 'string': found.append(ts[j+1][1][1:-1]); break
        if word == 'ssrLoadModule' and i > 0 and ts[i-1][1] == '.' and i+2 < len(ts) and ts[i+1][1] == '(' and ts[i+2][0] == 'string':
            found.append(ts[i+2][1][1:-1])
    return found
def explicit_ci_tests(workflow):
    commands = workflow.replace('\\\n', ' ').splitlines(); found = set()
    for line in commands:
        try: args = shlex.split(line.strip(), comments=True)
        except ValueError: continue
        if args[:7] == ['docker','compose','exec','-T','frontend','node','--test']:
            found.update(a for a in args[7:] if a.startswith('tests/') and not any(c in a for c in '*$'))
    return found
def coverage(root):
    front = root/'frontend'; executed = explicit_ci_tests((root/'.github/workflows/ci.yml').read_text()); errors=[]; reached=set()
    for name in REQUIRED_TESTS:
        test = front/'tests'/name
        if 'tests/'+name not in executed or not test.is_file(): errors.append('Required M4 test missing or not executed in CI: '+name); continue
        ts=tokens(test.read_text());
        if not any(ts[i][1]=='test' and ts[i+1][1]=='(' for i in range(len(ts)-1)): errors.append('No executable test cases: '+name); continue
        stack=[test]
        while stack:
            p=stack.pop().resolve()
            if p in reached: continue
            if not p.is_relative_to(front.resolve()) or not p.is_file(): continue
            reached.add(p)
            for spec in imports(p.read_text(encoding='utf-8-sig')):
                if spec.startswith('/src/'): q=front/spec.lstrip('/')
                elif spec.startswith('.'): q=p.parent/spec
                else: continue
                options=[q,q.with_suffix('.js'),q.with_suffix('.jsx'),q/'index.js'] if not q.suffix else [q]
                stack.extend(x for x in options if x.is_file())
    covered={p.relative_to(root.resolve()).as_posix() for p in reached}
    for name in M4_MODULES:
        if 'frontend/src/'+name not in covered: errors.append('M4 module has no executed import graph coverage: '+name)
    return covered, errors
