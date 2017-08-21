'use strict';

// Core packages
const fs = require('fs');
const util = require('util');
const pjson = require('../../package.json');

// Third-party packages
const Generator = require('yeoman-generator');

module.exports = class extends Generator {
  prompting() {
    let prompts = []

    if (fs.existsSync(this.destinationPath('.gitignore'))) {
      prompts.push(
        {
          type    : 'confirm',
          name    : 'updateGitignore',
          message : 'Should we update .gitignore?'
        }
      );
    }

    if (fs.existsSync(this.destinationPath('package.json'))) {
      prompts.push(
        {
          type    : 'confirm',
          name    : 'updateDevDependencies',
          message : 'Should we update "devDependencies" in package.json?'
        }
      );
      prompts.push(
        {
          type    : 'confirm',
          name    : 'updateScripts',
          message : 'Should we update "scripts" in package.json?'
        }
      );
    }

    return this.prompt(prompts).then(
      (answers) => {
        this.answers = answers;
      }
    );
  }

  writing() {
    // Defaults
    let options = {
      'version': pjson.version
    };

    // Overrides
    Object.assign(options, this.options);

    // The run script itself
    this.fs.copyTpl(
      this.templatePath('run'),
      this.destinationPath('run'),
      options
    );

    // .gitignore
    if (! fs.existsSync(this.destinationPath('.gitignore'))) {
      this.fs.copy(
        this.templatePath('gitignore'),
        this.destinationPath('.gitignore')
      );
    } else {
      if (this.answers.updateGitignore) {
        const currentContents = fs.readFileSync(this.destinationPath('.gitignore'), 'utf8');
        const currentBlocks = currentContents.split(/\r?\n\r?\n/);
        const incomingContents = fs.readFileSync(this.templatePath('gitignore'), 'utf8');
        const incomingBlocks = incomingContents.split(/\r?\n\r?\n/);

        let addedBlocks = [];
        let newBlocks = [];

        incomingBlocks.forEach(
          function(block) {
            const match = block.trim().match(/^# \[([^\]]+)\] (.*)\n([\s\S]*)/);

            if (match) {
              const id = match[1]
              const title = match[2]
              const ignores = match[3]

              newBlocks.push("# [" + id + "] " + title + "\n" + ignores.trim())

              addedBlocks.push(id)
            }
          }
        );

        currentBlocks.forEach(
          function(block) {
            const match = block.trim().match(/^# \[([^\]]+)\] (.*)\n([\s\S]*)/);

            if (match) {
              const id = match[1]

              // Keep blocks that haven't already been added
              if (addedBlocks.indexOf(id) == -1) {
                newBlocks.push(block.trim())
              }
            } else {
              newBlocks.push(block.trim())
            }
          }
        )

        fs.writeFileSync(
          this.destinationPath('.gitignore'),
          newBlocks.join("\n\n"),
          'utf8'
        );
      }
    }

    // package,json
    if (! fs.existsSync(this.destinationPath('package.json'))) {
      // Copy default package.json
      this.fs.copy(
        this.templatePath('package.json'),
        this.destinationPath('package.json')
      );
    } else if (this.answers.updateDevDependencies || this.answers.updateScripts) {
      // We're updating package.json, so parse contents of both new and old package.json
      const currentJson = fs.readFileSync(this.destinationPath('package.json'), 'utf8');
      const incomingJson = fs.readFileSync(this.templatePath('package.json'), 'utf8');
      const packageContents = JSON.parse(currentJson);
      const incomingPackageContents = JSON.parse(incomingJson);

      // Update devDependencies if requested
      if (this.answers.updateDevDependencies) {
        const currentDevDependencies = packageContents['devDependencies'] || {};
        const incomingDevDependencies = incomingPackageContents['devDependencies'];
        const updatedDevDependencies = util._extend(currentDevDependencies, incomingDevDependencies);
        packageContents['devDependencies'] = updatedDevDependencies;
      }

      // Update scripts if requested
      if (this.answers.updateScripts) {
        const currentScripts = packageContents['scripts'] || {};
        const incomingScripts = incomingPackageContents['scripts'];
        const updatedScripts = util._extend(currentScripts, incomingScripts);
        packageContents['scripts'] = updatedScripts;
      }

      // .sass-lint.yaml
      this.fs.copyTpl(
        this.templatePath('sass-lint.yml'),
        this.destinationPath('.sass-lint.yml')
      );

      const updatedJson = JSON.stringify(packageContents, null, 2);
      fs.writeFileSync(
        this.destinationPath('package.json'),
        updatedJson,
        'utf8'
      );
    }
  }
};
