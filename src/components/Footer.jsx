function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-in">
        <span>© {new Date().getFullYear()} Online Exam Portal. All rights reserved.</span>
        <span>
          Developed by{" "}
          <a
            className="dev-link"
            href="https://hasan-portfilo.netlify.app/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Hasan Talukder
          </a>
        </span>
      </div>
    </footer>
  );
}

export default Footer;