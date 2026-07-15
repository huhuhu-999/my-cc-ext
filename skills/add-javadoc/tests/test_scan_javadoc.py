import importlib.util
import io
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path


SCRIPT_PATH = Path(__file__).parents[1] / "scripts" / "scan_javadoc.py"
SPEC = importlib.util.spec_from_file_location("scan_javadoc", SCRIPT_PATH)
scan_javadoc = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(scan_javadoc)


class ScanJavadocTest(unittest.TestCase):

    def test_constructor_is_not_reported_as_method(self):
        lines = [
            "public class UserServiceImpl {",
            "    public UserServiceImpl(String name) {}",
            "    public void execute() {}",
            "}",
        ]

        methods = scan_javadoc.extract_methods(lines, class_name="UserServiceImpl")

        self.assertEqual(["execute"], [method["name"] for method in methods])

    def test_missing_javadoc_does_not_duplicate_empty_param_issue(self):
        lines = ["public String find(String name) { return name; }"]
        method = scan_javadoc.extract_methods(lines)[0]

        status = scan_javadoc.analyze_method(lines, method)

        self.assertEqual(["name"], status.missing_params)
        self.assertEqual([], status.empty_desc_params)

    def test_missing_class_javadoc_requires_attention(self):
        report = scan_javadoc.FileReport(
            file_path="UserService.java",
            relative_path="UserService.java",
            is_interface=True,
            has_class_javadoc=False,
            class_name="UserService",
        )

        self.assertTrue(report.needs_attention())

    def test_final_class_name_is_detected(self):
        lines = ["public final class UserServiceImpl implements UserService {"]

        class_name, is_interface, interface_name = scan_javadoc.extract_class_name(lines)

        self.assertEqual("UserServiceImpl", class_name)
        self.assertFalse(is_interface)
        self.assertEqual("UserService", interface_name)

    def test_relative_file_is_resolved_from_root(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            expected = root / "src" / "UserService.java"

            files = scan_javadoc.find_java_files(root, files=["src/UserService.java"])

            self.assertEqual([str(expected.resolve())], files)

    def test_summary_mode_omits_file_details(self):
        report = scan_javadoc.FileReport(
            file_path="UserService.java",
            relative_path="UserService.java",
            is_interface=True,
            has_class_javadoc=False,
            class_name="UserService",
        )
        output = io.StringIO()

        with redirect_stdout(output):
            scan_javadoc.print_summary([report], include_details=False)

        self.assertIn("扫描文件数", output.getvalue())
        self.assertNotIn("需要补充 JavaDoc 的方法详情", output.getvalue())


if __name__ == "__main__":
    unittest.main()
