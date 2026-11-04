import tempfile
import unittest
from pathlib import Path
import check_backend_smoke_coverage as backend
import m4_frontend_coverage as frontend

class CoverageTests(unittest.TestCase):
    def test_backend_real_subprocess_module_execution(self):
        source="import subprocess,sys\ndef test_cli():\n subprocess.check_output([sys.executable,'-m','app.mintrud_scan_inventory_cli','--root','/private'])"
        self.assertTrue(backend.has_module_execution('app.mintrud_scan_inventory_cli',[source]))
        self.assertFalse(backend.has_module_execution('app.uncovered',[source]))
    def test_backend_text_mentions_are_not_execution(self):
        for source in ["# python -m app.mintrud_scan_inventory_cli", "hint='app.mintrud_scan_inventory_cli'", "def test_cli():\n hint=\"subprocess.run([sys.executable,'-m','app.mintrud_scan_inventory_cli'])\"", "def test_cli():\n argv=['python','-m','app.mintrud_scan_inventory_cli']"]:
            self.assertFalse(backend.has_module_execution('app.mintrud_scan_inventory_cli',[source]))
    def test_js_imports_ignore_comments_and_quoted_source(self):
        self.assertEqual(frontend.imports("// import x from './no.js'\nconst s=\"server.ssrLoadModule('/src/fake.jsx')\";"),[])
        self.assertEqual(frontend.imports("import x from './real.js'; await server.ssrLoadModule('/src/real.jsx');"),['./real.js','/src/real.jsx'])
    def test_ci_requires_actual_dependency_container_command(self):
        self.assertEqual(frontend.explicit_ci_tests('# docker compose exec -T frontend node --test tests/x.mjs'),set())
        self.assertEqual(frontend.explicit_ci_tests('node --test frontend/tests/x.mjs'),set())
        self.assertEqual(frontend.explicit_ci_tests('docker compose exec -T frontend node --test tests/x.mjs'),{'tests/x.mjs'})
    def test_required_test_removed_from_workflow_or_disk_fails(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);(root/'.github/workflows').mkdir(parents=True);(root/'frontend/tests').mkdir(parents=True)
            (root/'.github/workflows/ci.yml').write_text('docker compose exec -T frontend node --test '+' '.join('tests/'+n for n in frontend.REQUIRED_TESTS))
            for name in frontend.REQUIRED_TESTS:(root/'frontend/tests'/name).write_text('test("case",()=>{});')
            _,errors=frontend.coverage(root);self.assertTrue(any('no executed import graph' in e for e in errors))
            (root/'frontend/tests'/frontend.REQUIRED_TESTS[0]).unlink()
            _,errors=frontend.coverage(root);self.assertTrue(any('missing or not executed' in e for e in errors))
    def test_actual_candidate_positive_and_missing_command_negative(self):
        from unittest.mock import patch
        root=Path(__file__).resolve().parents[1]
        _,errors=frontend.coverage(root);self.assertEqual(errors,[])
        with patch.object(frontend,'explicit_ci_tests',return_value=set()):
            _,errors=frontend.coverage(root);self.assertTrue(any('not executed' in e for e in errors))
if __name__=='__main__':unittest.main()
