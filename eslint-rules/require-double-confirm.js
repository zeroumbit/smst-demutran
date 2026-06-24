/**
 * ESLint custom rule: require-double-confirm
 *
 * IMMUTABLE RULE: Any delete or disable (toggle ativo) operation MUST
 * be preceded by a double confirmation via useConfirmDialog hook.
 *
 * This rule checks that:
 *   1. Any supabase.from(...).delete() call is inside a function
 *      that contains await confirm(...).
 *   2. Any supabase.from(...).update({ ativo: !... }) call (toggle)
 *      is inside a function that contains await confirm(...).
 *
 * Regular form updates like update({ ativo: formData.ativo }) are
 * NOT flagged — only toggles (negation pattern) are checked.
 */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require double confirmation (useConfirmDialog) before delete or disable operations',
    },
    messages: {
      missingConfirm:
        'Toda operação de delete/desativação deve ter dupla confirmação via useConfirmDialog. Use "const confirmed = await confirm({...})" antes de chamar "{{ method }}".',
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode();

    function getNodeText(node) {
      return sourceCode.getText(node);
    }

    function isToggleAtivo(node) {
      if (
        node.type !== 'CallExpression' ||
        node.callee.type !== 'MemberExpression' ||
        node.callee.property.name !== 'update' ||
        !node.arguments.length ||
        node.arguments[0].type !== 'ObjectExpression'
      ) {
        return false;
      }

      return node.arguments[0].properties.some((prop) => {
        if (prop.type !== 'Property' || prop.key.type !== 'Identifier' || prop.key.name !== 'ativo') {
          return false;
        }
        if (!prop.value) return false;
        if (prop.value.type === 'UnaryExpression' && prop.value.operator === '!') {
          return true;
        }
        if (prop.value.type === 'Identifier' && prop.value.name.startsWith('formData')) {
          return false;
        }
        return false;
      });
    }

    function isDeleteCall(node) {
      return (
        node.type === 'CallExpression' &&
        node.callee.type === 'MemberExpression' &&
        node.callee.property.name === 'delete'
      );
    }

    function isSupabaseFromCall(node) {
      let current = node;
      while (current && current.type === 'CallExpression') {
        if (
          current.callee.type === 'MemberExpression' &&
          current.callee.property.name === 'from'
        ) {
          return (
            current.callee.object.type === 'Identifier' &&
            current.callee.object.name === 'supabase'
          );
        }
        if (current.callee.type === 'MemberExpression' && current.callee.object) {
          current = current.callee.object;
        } else {
          return false;
        }
      }
      return false;
    }

    function findEnclosingFunction(node) {
      let current = node.parent;
      while (current) {
        if (
          current.type === 'FunctionDeclaration' ||
          current.type === 'FunctionExpression' ||
          current.type === 'ArrowFunctionExpression'
        ) {
          return current;
        }
        current = current.parent;
      }
      return null;
    }

    function checkDangerousCall(node) {
      if (!isSupabaseFromCall(node)) return;

      const isDelete = isDeleteCall(node);
      const isToggle = !isDelete && isToggleAtivo(node);

      if (!isDelete && !isToggle) return;

      const funcNode = findEnclosingFunction(node);
      if (!funcNode) return;

      const funcText = getNodeText(funcNode);
      if (funcText.includes('await confirm(')) return;

      context.report({
        node,
        messageId: 'missingConfirm',
        data: {
          method: isDelete ? 'delete()' : 'update({ ativo: !... })',
        },
      });
    }

    return {
      CallExpression: checkDangerousCall,
    };
  },
};
